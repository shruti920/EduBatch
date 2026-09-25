import Batch from "../models/Batch.js";
import User from "../models/User.js";
import Enrollment from "../models/Enrollment.js";
import Attendance from "../models/Attendance.js";
import { todayKey } from "../utils/date.js";
import { upcomingClasses } from "../utils/schedule.js";

/**
 * Revenue = money actually received, frozen per enrollment in `amountPaid`.
 * Includes students who paid and were later dropped (the money was still received).
 * Older records without amountPaid fall back to the Razorpay amount, then the batch fee.
 */
const revenueSummary = async () => {
  const paid = await Enrollment.find({ paymentStatus: "paid" })
    .select("amountPaid payment batch")
    .populate("payment", "amount status")
    .populate("batch", "fee")
    .lean();

  const summary = { collected: 0, online: 0, offline: 0, paidCount: paid.length };
  paid.forEach((e) => {
    const isOnline = Boolean(e.payment && e.payment.status === "paid");
    const amount = e.amountPaid ?? (isOnline ? e.payment.amount / 100 : e.batch?.fee || 0);
    summary.collected += amount;
    if (isOnline) summary.online += amount;
    else summary.offline += amount;
  });
  return summary;
};

const ATTENDED = ["present", "late"];

// Returns { [batchId]: activeSeatCount }
const seatMapFor = async (batchIds) => {
  const rows = await Enrollment.aggregate([
    { $match: { batch: { $in: batchIds }, isActive: true } },
    { $group: { _id: "$batch", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));
};

const withSeats = (batch, seatMap) => {
  const enrolledCount = seatMap[batch._id.toString()] || 0;
  return {
    ...batch.toJSON(),
    enrolledCount,
    seatsRemaining: Math.max(0, batch.capacity - enrolledCount),
    isFull: enrolledCount >= batch.capacity,
  };
};

// null when there is nothing to measure — the UI shows "—" instead of a fake 100%
const rate = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : null);

// GET /dashboard/admin
export const getAdminDashboard = async (req, res, next) => {
  try {
    const today = todayKey();

    const [batches, archivedBatches, students, teachers, enrollments, todaySessions, revenue] =
      await Promise.all([
        Batch.find({ status: { $ne: "archived" } })
          .populate("teacher", "name")
          .sort({ createdAt: -1 }),
        Batch.countDocuments({ status: "archived" }),
        User.countDocuments({ role: "student", isActive: true }),
        User.countDocuments({ role: "teacher", isActive: true }),
        Enrollment.find({ isActive: true }).populate("batch", "fee status"),
        Attendance.find({ date: today }).select("batch"),
        revenueSummary(),
      ]);

    const seatMap = await seatMapFor(batches.map((b) => b._id));
    const batchRows = batches.map((b) => withSeats(b, seatMap));
    const activeBatches = batchRows.filter((b) => b.status === "active");

    // Collected = money received (frozen amounts). Pending = what active seats still owe at today's fee.
    const fees = {
      collected: revenue.collected,
      collectedOnline: revenue.online,
      collectedOffline: revenue.offline,
      paidCount: revenue.paidCount,
      pending: 0,
      pendingCount: 0,
      waivedCount: 0,
    };
    enrollments.forEach((e) => {
      if (e.paymentStatus === "pending") {
        fees.pending += e.batch?.fee || 0;
        fees.pendingCount += 1;
      } else if (e.paymentStatus === "waived") {
        fees.waivedCount += 1;
      }
    });

    const markedToday = new Set(todaySessions.map((s) => s.batch.toString()));
    const activeCapacity = activeBatches.reduce((sum, b) => sum + b.capacity, 0);
    const activeSeats = activeBatches.reduce((sum, b) => sum + b.enrolledCount, 0);

    res.status(200).json({
      success: true,
      data: {
        counts: {
          students,
          teachers,
          activeBatches: activeBatches.length,
          upcomingBatches: batchRows.filter((b) => b.status === "upcoming").length,
          archivedBatches,
          enrolledSeats: enrollments.length,
          activeCapacity,
          activeSeats,
          fullBatches: batchRows.filter((b) => b.isFull).length,
        },
        fees,
        attendance: {
          markedToday: markedToday.size,
          pendingToday: activeBatches.filter((b) => !markedToday.has(b._id.toString())).length,
        },
        batches: batchRows,
        // Admin sees the whole institute's classes for today
        upcomingClasses: upcomingClasses(batches, { days: 1, limit: 12 }),
      },
      message: "Admin dashboard retrieved.",
    });
  } catch (error) {
    next(error);
  }
};

// GET /dashboard/teacher
export const getTeacherDashboard = async (req, res, next) => {
  try {
    const batches = await Batch.find({
      teacher: req.user._id,
      status: { $ne: "archived" },
    }).sort({ createdAt: -1 });

    const batchIds = batches.map((b) => b._id);
    const [seatMap, todaySessions] = await Promise.all([
      seatMapFor(batchIds),
      Attendance.find({ batch: { $in: batchIds }, date: todayKey() }).select("batch"),
    ]);

    const markedToday = new Set(todaySessions.map((s) => s.batch.toString()));
    const batchRows = batches.map((b) => ({
      ...withSeats(b, seatMap),
      markedToday: markedToday.has(b._id.toString()),
    }));

    const activeBatches = batchRows.filter((b) => b.status === "active");

    res.status(200).json({
      success: true,
      data: {
        totalBatches: batchRows.length,
        totalStudents: batchRows.reduce((sum, b) => sum + b.enrolledCount, 0),
        activeBatches: activeBatches.length,
        markedToday: activeBatches.filter((b) => b.markedToday).length,
        batches: batchRows,
        upcomingClasses: upcomingClasses(batches, { days: 7, limit: 6 }),
      },
      message: "Teacher dashboard retrieved.",
    });
  } catch (error) {
    next(error);
  }
};

// GET /dashboard/student
export const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id.toString();

    const enrollments = await Enrollment.find({ student: req.user._id, isActive: true })
      .populate({
        path: "batch",
        select: "-createdBy -__v",
        populate: { path: "teacher", select: "name email" },
      })
      .sort({ enrolledAt: -1 });

    const batchIds = enrollments.map((e) => e.batch?._id).filter(Boolean);
    const sessions = await Attendance.find({
      batch: { $in: batchIds },
      "records.student": req.user._id,
    }).select("batch records");

    // Per-batch attendance so each enrolled batch card can show its own rate
    const perBatch = {};
    let total = 0;
    let attended = 0;

    sessions.forEach((session) => {
      const record = session.records.find((r) => r.student.toString() === studentId);
      if (!record) return;
      const key = session.batch.toString();
      perBatch[key] ??= { total: 0, attended: 0 };
      perBatch[key].total += 1;
      total += 1;
      if (ATTENDED.includes(record.status)) {
        perBatch[key].attended += 1;
        attended += 1;
      }
    });

    const rows = enrollments.map((e) => {
      const stats = perBatch[e.batch?._id?.toString()] || { total: 0, attended: 0 };
      return {
        ...e.toJSON(),
        attendance: { ...stats, rate: rate(stats.attended, stats.total) },
      };
    });

    const pending = enrollments.filter((e) => e.paymentStatus === "pending");

    res.status(200).json({
      success: true,
      data: {
        totalEnrolled: enrollments.length,
        attendance: { total, attended, rate: rate(attended, total) },
        fees: {
          pendingCount: pending.length,
          pendingAmount: pending.reduce((sum, e) => sum + (e.batch?.fee || 0), 0),
        },
        enrollments: rows,
        upcomingClasses: upcomingClasses(
          enrollments.map((e) => e.batch),
          { days: 7, limit: 6 }
        ),
      },
      message: "Student dashboard retrieved.",
    });
  } catch (error) {
    next(error);
  }
};

/* ---------------- Admin analytics ---------------- */

const tz = () => process.env.APP_TIMEZONE || "Asia/Kolkata";

// "YYYY-MM" of a moment in the institute's timezone
const monthKeyOf = (date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz(), year: "numeric", month: "2-digit" })
      .formatToParts(new Date(date))
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}`;
};

// The last `count` month keys, oldest first, ending with the current month
const recentMonths = (count, now = new Date()) => {
  const [y, m] = monthKeyOf(now).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
};

const monthLabel = (key) =>
  new Date(`${key}-15T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });

/**
 * GET /dashboard/admin/analytics?months=6 (admin)
 * Month by month: fees received (online/offline), new enrollments and the
 * attendance rate across all classes marked that month.
 */
export const getAdminAnalytics = async (req, res, next) => {
  try {
    const count = Math.min(12, Math.max(3, Number.parseInt(req.query.months, 10) || 6));
    const keys = recentMonths(count);
    const first = new Date(`${keys[0]}-01T00:00:00Z`);
    // A day of margin so the timezone offset never drops the first day
    const since = new Date(first.getTime() - 24 * 60 * 60 * 1000);

    const [paid, enrolled, attendance] = await Promise.all([
      Enrollment.find({ paymentStatus: "paid" })
        .select("amountPaid paidAt updatedAt payment batch")
        .populate("payment", "amount status paidAt")
        .populate("batch", "fee")
        .lean(),
      Enrollment.find({ enrolledAt: { $gte: since } }).select("enrolledAt").lean(),
      Attendance.find({ date: { $gte: since } }).select("date records.status").lean(),
    ]);

    const rows = Object.fromEntries(
      keys.map((key) => [
        key,
        { month: key, label: monthLabel(key), revenue: 0, online: 0, offline: 0, payments: 0, enrollments: 0, marked: 0, attended: 0 },
      ])
    );

    paid.forEach((e) => {
      const isOnline = Boolean(e.payment && e.payment.status === "paid");
      const when = e.paidAt || (isOnline && e.payment.paidAt) || e.updatedAt;
      const row = rows[monthKeyOf(when)];
      if (!row) return;
      const amount = e.amountPaid ?? (isOnline ? e.payment.amount / 100 : e.batch?.fee || 0);
      row.revenue += amount;
      row.payments += 1;
      if (isOnline) row.online += amount;
      else row.offline += amount;
    });

    enrolled.forEach((e) => {
      const row = rows[monthKeyOf(e.enrolledAt)];
      if (row) row.enrollments += 1;
    });

    // Attendance dates are stored as the local calendar day at 00:00 UTC
    attendance.forEach((a) => {
      const row = rows[a.date.toISOString().slice(0, 7)];
      if (!row) return;
      a.records.forEach((r) => {
        row.marked += 1;
        if (r.status === "present" || r.status === "late") row.attended += 1;
      });
    });

    const months = keys.map((key) => {
      const { marked, attended, ...rest } = rows[key];
      return { ...rest, attendanceRate: marked ? Math.round((attended / marked) * 100) : null, marked };
    });

    res.status(200).json({ success: true, data: { months }, message: "Analytics retrieved." });
  } catch (error) {
    next(error);
  }
};
