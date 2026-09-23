import Attendance from "../models/Attendance.js";
import Batch from "../models/Batch.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

/**
 * Normalizes any date string or Date object to midnight UTC (00:00:00.000Z).
 * Ensures consistency across disparate client timezones and prevents duplicate records.
 */
const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Record or revise a whole-class attendance register for a cohort on a specific date.
 * Enforces role isolation, enrollment validation, and atomic upsert behavior.
 */
export const markAttendance = async (req, res, next) => {
  try {
    const { batch: batchId, date, records } = req.body;

    // 1. Verify batch exists and is not archived
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return next(new AppError("Cohort batch not found.", 404));
    }
    if (batch.isArchived || batch.status === "archived") {
      return next(
        new AppError("Cannot record attendance for an archived cohort.", 400)
      );
    }

    // 2. Strict Role Isolation:
    // Teachers may only record attendance for batches assigned under their charge.
    if (req.user.role === "teacher" && batch.teacher?.toString() !== req.user._id.toString()) {
      return next(
        new AppError(
          "Forbidden: You are only authorized to mark attendance for cohorts assigned under your charge.",
          403
        )
      );
    }

    if (req.user.role === "student") {
      return next(
        new AppError("Forbidden: Candidates are not permitted to record attendance registers.", 403)
      );
    }

    // 3. Verify Active Cohort Enrollments
    const activeEnrollments = await Enrollment.find({
      batch: batch._id,
      isActive: true,
    }).select("student");

    if (activeEnrollments.length === 0) {
      return next(
        new AppError(
          "Cannot mark attendance for a cohort with zero enrolled candidates.",
          400
        )
      );
    }

    const enrolledStudentIds = new Set(
      activeEnrollments.map((enr) => enr.student.toString())
    );

    // Validate that every submitted candidate is actively enrolled in this batch
    for (const record of records) {
      if (!enrolledStudentIds.has(record.student)) {
        return next(
          new AppError(
            `Candidate with ID ${record.student} is not actively enrolled in this cohort.`,
            400
          )
        );
      }
    }

    // 4. Normalize date to midnight UTC
    const normalizedDate = normalizeDate(date);

    // 5. Atomic Upsert: Update existing register if already recorded for today, or create new
    const updatedAttendance = await Attendance.findOneAndUpdate(
      { batch: batch._id, date: normalizedDate },
      {
        records,
        markedBy: req.user._id,
      },
      {
        returnDocument: "after",
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate("records.student", "name email phone avatar")
      .populate("markedBy", "name email role")
      .populate("batch", "name subject venue schedule");

    res.status(200).json({
      success: true,
      message: `Attendance register recorded successfully for ${normalizedDate.toISOString().slice(0, 10)}.`,
      data: {
        attendance: updatedAttendance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance history for a batch with summary aggregates (Admin or assigned Teacher).
 */
export const getBatchAttendance = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { date, startDate, endDate } = req.query;

    const batch = await Batch.findById(batchId).populate("teacher", "name email");
    if (!batch) {
      return next(new AppError("Cohort batch not found.", 404));
    }

    // Role check: Admin or assigned teacher
    if (req.user.role === "student") {
      return next(
        new AppError("Forbidden: Candidates cannot inspect cohort attendance registers.", 403)
      );
    }

    if (req.user.role === "teacher" && batch.teacher?._id?.toString() !== req.user._id.toString()) {
      return next(
        new AppError(
          "Forbidden: You can only view attendance registers for cohorts assigned under your charge.",
          403
        )
      );
    }

    const filter = { batch: batch._id };

    if (date) {
      filter.date = normalizeDate(date);
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = normalizeDate(startDate);
      if (endDate) filter.date.$lte = normalizeDate(endDate);
    }

    const attendances = await Attendance.find(filter)
      .populate("records.student", "name email phone avatar")
      .populate("markedBy", "name email role")
      .sort({ date: -1 });

    // Compute session summary metrics
    const sessions = attendances.map((att) => {
      const total = att.records.length;
      const present = att.records.filter((r) => r.status === "present").length;
      const late = att.records.filter((r) => r.status === "late").length;
      const absent = att.records.filter((r) => r.status === "absent").length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

      return {
        _id: att._id,
        date: att.date,
        markedBy: att.markedBy,
        createdAt: att.createdAt,
        updatedAt: att.updatedAt,
        summary: {
          total,
          present,
          late,
          absent,
          rate,
        },
        records: att.records,
      };
    });

    res.status(200).json({
      success: true,
      message: `Retrieved ${sessions.length} attendance sessions for ${batch.name}.`,
      data: {
        batch,
        totalSessions: sessions.length,
        sessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance register for a batch on a specific date (Admin or assigned Teacher).
 * Useful to check if today's roll call is already recorded and pre-fill the form.
 */
export const getBatchAttendanceByDate = async (req, res, next) => {
  try {
    const { batchId, date } = req.params;

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return next(new AppError("Cohort batch not found.", 404));
    }

    if (req.user.role === "student") {
      return next(
        new AppError("Forbidden: Candidates cannot inspect cohort attendance registers.", 403)
      );
    }

    if (req.user.role === "teacher" && batch.teacher?.toString() !== req.user._id.toString()) {
      return next(
        new AppError(
          "Forbidden: You can only inspect attendance for cohorts assigned under your charge.",
          403
        )
      );
    }

    const normalizedDate = normalizeDate(date);

    const attendance = await Attendance.findOne({
      batch: batch._id,
      date: normalizedDate,
    })
      .populate("records.student", "name email phone avatar")
      .populate("markedBy", "name email role");

    res.status(200).json({
      success: true,
      message: attendance
        ? "Attendance register found."
        : "No attendance register recorded for this date.",
      data: {
        isMarked: !!attendance,
        attendance: attendance || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get logged-in candidate's own attendance rates, per-batch breakdown, and session logs.
 */
export const getMyAttendance = async (req, res, next) => {
  try {
    // 1. Find all active enrollments for this candidate
    const enrollments = await Enrollment.find({
      student: req.user._id,
      isActive: true,
    }).populate("batch", "name subject schedule fee venue teacher");

    if (enrollments.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Candidate has no active cohort enrollments.",
        data: {
          overall: {
            totalSessions: 0,
            present: 0,
            late: 0,
            absent: 0,
            percentage: 100,
          },
          batches: [],
          history: [],
        },
      });
    }

    const batchIds = enrollments.map((e) => e.batch._id);

    // 2. Find all attendance registers for these batches containing this candidate
    const attendanceDocs = await Attendance.find({
      batch: { $in: batchIds },
      "records.student": req.user._id,
    })
      .populate("batch", "name subject")
      .sort({ date: -1 });

    let totalSessions = 0;
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;

    const history = [];

    // Map of batchId -> { batch, total, present, late, absent }
    const batchStatsMap = {};
    enrollments.forEach((e) => {
      batchStatsMap[e.batch._id.toString()] = {
        batch: e.batch,
        totalSessions: 0,
        present: 0,
        late: 0,
        absent: 0,
        percentage: 100,
      };
    });

    attendanceDocs.forEach((doc) => {
      const studentRecord = doc.records.find(
        (r) => r.student.toString() === req.user._id.toString()
      );

      if (studentRecord) {
        totalSessions += 1;
        const bId = doc.batch._id.toString();

        if (batchStatsMap[bId]) {
          batchStatsMap[bId].totalSessions += 1;
        }

        if (studentRecord.status === "present") {
          totalPresent += 1;
          if (batchStatsMap[bId]) batchStatsMap[bId].present += 1;
        } else if (studentRecord.status === "late") {
          totalLate += 1;
          if (batchStatsMap[bId]) batchStatsMap[bId].late += 1;
        } else if (studentRecord.status === "absent") {
          totalAbsent += 1;
          if (batchStatsMap[bId]) batchStatsMap[bId].absent += 1;
        }

        history.push({
          _id: doc._id,
          date: doc.date,
          batch: {
            _id: doc.batch._id,
            name: doc.batch.name,
            subject: doc.batch.subject,
          },
          status: studentRecord.status,
          remarks: studentRecord.remarks || "",
        });
      }
    });

    // Compute percentages (present + late counts as attended)
    const overallPercentage =
      totalSessions > 0
        ? Math.round(((totalPresent + totalLate) / totalSessions) * 1000) / 10
        : 100;

    const batches = Object.values(batchStatsMap).map((b) => ({
      ...b,
      percentage:
        b.totalSessions > 0
          ? Math.round(((b.present + b.late) / b.totalSessions) * 1000) / 10
          : 100,
    }));

    res.status(200).json({
      success: true,
      message: "Candidate attendance summary retrieved.",
      data: {
        overall: {
          totalSessions,
          present: totalPresent,
          late: totalLate,
          absent: totalAbsent,
          percentage: overallPercentage,
        },
        batches,
        history,
      },
    });
  } catch (error) {
    next(error);
  }
};
