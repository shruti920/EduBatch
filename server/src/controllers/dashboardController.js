import Batch from "../models/Batch.js";
import User from "../models/User.js";
import Enrollment from "../models/Enrollment.js";
import Attendance from "../models/Attendance.js";
import { todayKey } from "../utils/date.js";

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

    const [batches, archivedBatches, students, teachers, enrollments, todaySessions] =
      await Promise.all([
        Batch.find({ status: { $ne: "archived" } })
          .populate("teacher", "name")
          .sort({ createdAt: -1 }),
        Batch.countDocuments({ status: "archived" }),
        User.countDocuments({ role: "student", isActive: true }),
        User.countDocuments({ role: "teacher", isActive: true }),
        Enrollment.find({ isActive: true }).populate("batch", "fee status"),
        Attendance.find({ date: today }).select("batch"),
      ]);

    const seatMap = await seatMapFor(batches.map((b) => b._id));
    const batchRows = batches.map((b) => withSeats(b, seatMap));
    const activeBatches = batchRows.filter((b) => b.status === "active");

    // Fees are computed from each enrollment's batch fee (INR)
    const fees = { collected: 0, pending: 0, paidCount: 0, pendingCount: 0, waivedCount: 0 };
    enrollments.forEach((e) => {
      const fee = e.batch?.fee || 0;
      if (e.paymentStatus === "paid") {
        fees.collected += fee;
        fees.paidCount += 1;
      } else if (e.paymentStatus === "pending") {
        fees.pending += fee;
        fees.pendingCount += 1;
      } else {
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
      },
      message: "Student dashboard retrieved.",
    });
  } catch (error) {
    next(error);
  }
};
