import Batch from "../models/Batch.js";
import User from "../models/User.js";
import Enrollment from "../models/Enrollment.js";
import Attendance from "../models/Attendance.js";

const normalizeDate = (d) => {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Institutional Overview & Aggregation Desk for Admin
 * Delivers 100% genuine database metrics across Batches, Enrollments, Attendance, and Users.
 */
export const getAdminDashboard = async (req, res, next) => {
  try {
    // 1. Batches metrics
    const [allBatches, archivedBatchCount] = await Promise.all([
      Batch.find({ isArchived: false }).populate("teacher", "name email").sort({ createdAt: -1 }),
      Batch.countDocuments({ isArchived: true }),
    ]);

    const activeBatches = allBatches.filter((b) => b.status === "active");
    const upcomingBatches = allBatches.filter((b) => b.status === "upcoming");
    const totalCapacity = activeBatches.reduce((acc, b) => acc + (b.capacity || 0), 0);

    // 2. User community metrics
    const [totalCandidates, totalFaculty, totalAdmins] = await Promise.all([
      User.countDocuments({ role: "student", isActive: true }),
      User.countDocuments({ role: "teacher", isActive: true }),
      User.countDocuments({ role: "admin", isActive: true }),
    ]);

    // 3. Enrollment & Seat Utilization metrics
    const activeEnrollments = await Enrollment.find({ isActive: true })
      .populate("batch", "name fee capacity")
      .populate("student", "name email");

    const totalEnrolledSeats = activeEnrollments.length;
    const seatUtilization = totalCapacity > 0 ? Math.round((totalEnrolledSeats / totalCapacity) * 1000) / 10 : 0;

    // Enrolled count lookup per batch
    const batchEnrollmentCountMap = {};
    activeEnrollments.forEach((e) => {
      if (e.batch?._id) {
        const bId = e.batch._id.toString();
        batchEnrollmentCountMap[bId] = (batchEnrollmentCountMap[bId] || 0) + 1;
      }
    });

    const batchesWithCounts = allBatches.map((b) => {
      const count = batchEnrollmentCountMap[b._id.toString()] || 0;
      return {
        ...b.toObject(),
        enrolledCount: count,
        seatsRemaining: Math.max(0, b.capacity - count),
        isFull: count >= b.capacity,
      };
    });

    const hardLockedBatches = batchesWithCounts.filter((b) => b.isFull);

    // 4. Financial ledger aggregates (Realized Tuition & Dues)
    let realizedFees = 0;
    let pendingFees = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let waivedCount = 0;

    activeEnrollments.forEach((e) => {
      const fee = e.batch?.fee || 0;
      if (e.paymentStatus === "paid") {
        realizedFees += fee;
        paidCount += 1;
      } else if (e.paymentStatus === "pending") {
        pendingFees += fee;
        pendingCount += 1;
      } else if (e.paymentStatus === "waived") {
        waivedCount += 1;
      }
    });

    // 5. Attendance institutional metrics
    const totalAttendanceSessions = await Attendance.countDocuments();
    const recentSessions = await Attendance.find().sort({ date: -1 }).limit(10);

    let totalAttendanceRecords = 0;
    let attendedRecords = 0;

    recentSessions.forEach((sess) => {
      sess.records.forEach((r) => {
        totalAttendanceRecords += 1;
        if (r.status === "present" || r.status === "late") {
          attendedRecords += 1;
        }
      });
    });

    const averageAttendanceRate =
      totalAttendanceRecords > 0
        ? Math.round((attendedRecords / totalAttendanceRecords) * 1000) / 10
        : 100;

    // 6. Dynamic Operational Alerts generated from live data
    const alerts = [];

    // Capacity alerts
    hardLockedBatches.forEach((b) => {
      alerts.push({
        id: `cap-${b._id}`,
        type: "capacity",
        level: "warning",
        title: "CAPACITY LOCKED",
        time: "Active Lock",
        message: `Cohort "${b.name}" has reached 100% capacity (${b.enrolledCount}/${b.capacity} seats). Server is rejecting overflow admissions.`,
      });
    });

    // Today's roll call audit alert
    const todayNormalized = normalizeDate(new Date());
    const todaySessions = await Attendance.find({ date: todayNormalized });
    const todayMarkedBatchIds = new Set(todaySessions.map((s) => s.batch.toString()));

    activeBatches.forEach((b) => {
      if (!todayMarkedBatchIds.has(b._id.toString())) {
        alerts.push({
          id: `att-${b._id}`,
          type: "attendance",
          level: "info",
          title: "ROLL CALL PENDING",
          time: "Today",
          message: `Session register for "${b.name}" has not been submitted for today.`,
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Admin institutional overview metrics retrieved.",
      data: {
        counts: {
          totalBatches: allBatches.length,
          activeBatches: activeBatches.length,
          upcomingBatches: upcomingBatches.length,
          archivedBatches: archivedBatchCount,
          totalCandidates,
          totalFaculty,
          totalAdmins,
          totalEnrolledSeats,
          totalCapacity,
          seatUtilization,
          hardLockedCount: hardLockedBatches.length,
        },
        financials: {
          realizedFees,
          pendingFees,
          totalPotentialFees: realizedFees + pendingFees,
          paidCount,
          pendingCount,
          waivedCount,
        },
        attendance: {
          totalSessions: totalAttendanceSessions,
          averageRate: averageAttendanceRate,
          todaySessionsCount: todaySessions.length,
        },
        batches: batchesWithCounts,
        alerts: alerts.slice(0, 5), // Return top 5 live alerts
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Faculty Schedule & Workload Overview
 */
export const getTeacherDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user._id;

    // Assigned batches
    const assignedBatches = await Batch.find({
      teacher: teacherId,
      isArchived: false,
    }).sort({ createdAt: -1 });

    const batchIds = assignedBatches.map((b) => b._id);

    // Active enrollments across assigned batches
    const enrollments = await Enrollment.find({
      batch: { $in: batchIds },
      isActive: true,
    }).populate("student", "name email");

    const batchCountMap = {};
    enrollments.forEach((e) => {
      const bId = e.batch.toString();
      batchCountMap[bId] = (batchCountMap[bId] || 0) + 1;
    });

    const batchesWithCounts = assignedBatches.map((b) => {
      const count = batchCountMap[b._id.toString()] || 0;
      return {
        ...b.toObject(),
        enrolledCount: count,
        seatsRemaining: Math.max(0, b.capacity - count),
        isFull: count >= b.capacity,
      };
    });

    const totalStudents = enrollments.length;
    const totalCapacity = assignedBatches.reduce((acc, b) => acc + (b.capacity || 0), 0);

    // Today's roll call status
    const todayNormalized = normalizeDate(new Date());
    const todaySessions = await Attendance.find({
      batch: { $in: batchIds },
      date: todayNormalized,
    });

    const isAllMarkedToday =
      assignedBatches.length > 0 && todaySessions.length >= assignedBatches.length;

    const rollCallStatus = isAllMarkedToday
      ? "VERIFIED"
      : todaySessions.length > 0
      ? "PARTIAL"
      : "PENDING";

    res.status(200).json({
      success: true,
      message: "Teacher faculty overview retrieved.",
      data: {
        totalBatches: assignedBatches.length,
        totalStudents,
        totalCapacity,
        rollCallStatus,
        todaySessionsCount: todaySessions.length,
        batches: batchesWithCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Candidate Student Desk Overview
 */
export const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const enrollments = await Enrollment.find({
      student: studentId,
      isActive: true,
    }).populate({
      path: "batch",
      populate: {
        path: "teacher",
        select: "name email phone avatar",
      },
    });

    const batchIds = enrollments.map((e) => e.batch?._id).filter(Boolean);

    // Attendance records for enrolled batches
    const attendanceDocs = await Attendance.find({
      batch: { $in: batchIds },
      "records.student": studentId,
    });

    let totalSessions = 0;
    let attended = 0;

    attendanceDocs.forEach((doc) => {
      const r = doc.records.find((rec) => rec.student.toString() === studentId.toString());
      if (r) {
        totalSessions += 1;
        if (r.status === "present" || r.status === "late") {
          attended += 1;
        }
      }
    });

    const attendanceRate = totalSessions > 0 ? Math.round((attended / totalSessions) * 1000) / 10 : 100;

    const hasPendingFees = enrollments.some((e) => e.paymentStatus === "pending");
    const allFeesPaid =
      enrollments.length > 0 &&
      enrollments.every((e) => e.paymentStatus === "paid" || e.paymentStatus === "waived");

    res.status(200).json({
      success: true,
      message: "Student candidate overview retrieved.",
      data: {
        totalEnrolled: enrollments.length,
        attendanceRate,
        totalSessions,
        attendedSessions: attended,
        feeStatus: hasPendingFees ? "PENDING" : allFeesPaid ? "CLEARED" : "NO DUES",
        hasPendingFees,
        enrollments,
      },
    });
  } catch (error) {
    next(error);
  }
};
