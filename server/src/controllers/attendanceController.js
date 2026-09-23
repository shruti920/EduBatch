import Attendance from "../models/Attendance.js";
import Batch from "../models/Batch.js";
import Enrollment from "../models/Enrollment.js";
import AppError from "../utils/AppError.js";
import { normalizeDate, todayKey } from "../utils/date.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const upsertDay = (batchId, date, records, markedBy) =>
  Attendance.findOneAndUpdate(
    { batch: batchId, date },
    { records, markedBy },
    { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

/**
 * POST /attendance — mark (or update) one batch's attendance for one day.
 * One document per batch per date; re-submitting the same date updates it.
 *
 * Rules:
 * - only the batch's own teacher (or an admin), only for an active batch
 * - not a future date, and not outside the batch's start/end dates
 * - every submitted student must be enrolled, and appear once
 * - every student who was enrolled by that day must be included (no silent gaps)
 */
export const markAttendance = async (req, res, next) => {
  try {
    const { batch: batchId, date, records } = req.body;

    const batch = await Batch.findById(batchId);
    if (!batch) return next(new AppError("Batch not found.", 404));

    if (req.user.role === "teacher" && batch.teacher?.toString() !== req.user._id.toString()) {
      return next(new AppError("You can only mark attendance for your own batches.", 403));
    }
    if (batch.status === "archived") {
      return next(new AppError("Attendance can't be marked for an archived batch.", 400));
    }
    if (batch.status !== "active") {
      return next(new AppError("This batch hasn't started. Mark it active before taking attendance.", 400));
    }

    const day = normalizeDate(date);
    if (Number.isNaN(day.getTime())) return next(new AppError("Invalid date.", 400));
    if (day > todayKey()) return next(new AppError("Attendance can't be marked for a future date.", 400));
    if (batch.startDate && day < normalizeDate(batch.startDate)) {
      return next(new AppError("This date is before the batch start date.", 400));
    }
    if (batch.endDate && day > normalizeDate(batch.endDate)) {
      return next(new AppError("This date is after the batch end date.", 400));
    }

    const enrollments = await Enrollment.find({ batch: batch._id, isActive: true }).select("student enrolledAt");
    if (enrollments.length === 0) {
      return next(new AppError("This batch has no enrolled students yet.", 400));
    }

    const enrolledIds = new Set(enrollments.map((e) => e.student.toString()));
    const submittedIds = new Set();

    for (const record of records) {
      if (!enrolledIds.has(record.student)) {
        return next(new AppError(`Student ${record.student} is not enrolled in this batch.`, 400));
      }
      if (submittedIds.has(record.student)) {
        return next(new AppError("A student appears more than once in this attendance list.", 400));
      }
      submittedIds.add(record.student);
    }

    // Students who were already enrolled on that day must all be marked.
    // (Someone who joined later can be included, but isn't required for an older date.)
    const missing = enrollments.filter(
      (e) => e.enrolledAt < new Date(day.getTime() + DAY_MS) && !submittedIds.has(e.student.toString())
    );
    if (missing.length) {
      return next(
        new AppError(`Mark every student in the batch. ${missing.length} student(s) are missing from this list.`, 400)
      );
    }

    let saved;
    try {
      saved = await upsertDay(batch._id, day, records, req.user._id);
    } catch (error) {
      // Two people saving the same new day at once: the second upsert hits the
      // unique { batch, date } index. Retrying turns it into a normal update.
      if (error.code !== 11000) throw error;
      saved = await upsertDay(batch._id, day, records, req.user._id);
    }

    const attendance = await Attendance.findById(saved._id)
      .populate("records.student", "name email")
      .populate("markedBy", "name role")
      .populate("batch", "name subject schedule");

    res.status(200).json({
      success: true,
      message: `Attendance saved for ${day.toISOString().slice(0, 10)}.`,
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /attendance/batch/:batchId — session history with per-day totals.
 */
export const getBatchAttendance = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { date, startDate, endDate } = req.query;

    const batch = await Batch.findById(batchId).populate("teacher", "name email");
    if (!batch) {
      return next(new AppError("Batch not found.", 404));
    }

    // Admin, or the batch's own teacher
    if (req.user.role === "student") {
      return next(
        new AppError("Students can't view batch attendance.", 403)
      );
    }

    if (req.user.role === "teacher" && batch.teacher?._id?.toString() !== req.user._id.toString()) {
      return next(
        new AppError(
          "You can only view attendance for your own batches.",
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
      message: `${sessions.length} sessions found for ${batch.name}.`,
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
 * GET /attendance/batch/:batchId/date/:date — used to pre-fill the marking form.
 */
export const getBatchAttendanceByDate = async (req, res, next) => {
  try {
    const { batchId, date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return next(new AppError("Date must be YYYY-MM-DD.", 400));

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return next(new AppError("Batch not found.", 404));
    }

    if (req.user.role === "student") {
      return next(
        new AppError("Students can't view batch attendance.", 403)
      );
    }

    if (req.user.role === "teacher" && batch.teacher?.toString() !== req.user._id.toString()) {
      return next(
        new AppError(
          "You can only view attendance for your own batches.",
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
        ? "Attendance found for this date."
        : "Attendance not marked for this date yet.",
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
 * GET /attendance/my — the student's overall and per-batch attendance.
 */
export const getMyAttendance = async (req, res, next) => {
  try {
    // 1. Active enrollments for this student
    const enrollments = await Enrollment.find({
      student: req.user._id,
      isActive: true,
    }).populate("batch", "name subject schedule fee venue teacher");

    if (enrollments.length === 0) {
      return res.status(200).json({
        success: true,
        message: "You are not enrolled in any batch yet.",
        data: {
          overall: {
            totalSessions: 0,
            present: 0,
            late: 0,
            absent: 0,
            percentage: null,
          },
          batches: [],
          history: [],
        },
      });
    }

    const batchIds = enrollments.map((e) => e.batch._id);

    // 2. Sessions in those batches that include this student
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
        percentage: null,
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
        : null; // null = no classes yet (shown as "—", not a fake 100%)

    const batches = Object.values(batchStatsMap).map((b) => ({
      ...b,
      percentage:
        b.totalSessions > 0
          ? Math.round(((b.present + b.late) / b.totalSessions) * 1000) / 10
          : null,
    }));

    res.status(200).json({
      success: true,
      message: "Attendance summary retrieved.",
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
