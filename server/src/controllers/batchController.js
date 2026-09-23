import Batch from "../models/Batch.js";
import User from "../models/User.js";
import Enrollment from "../models/Enrollment.js";
import AppError from "../utils/AppError.js";
import escapeRegex from "../utils/escapeRegex.js";

const TEACHER_FIELDS = "name email phone avatar";

const withRelations = (query) =>
  query.populate("teacher", TEACHER_FIELDS).populate("createdBy", "name email");

// Active seat count per batch, as a { batchId: count } map
const countActiveSeats = async (batchIds) => {
  const rows = await Enrollment.aggregate([
    { $match: { batch: { $in: batchIds }, isActive: true } },
    { $group: { _id: "$batch", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));
};

const withSeatCounts = async (batches) => {
  const seatMap = await countActiveSeats(batches.map((b) => b._id));
  return batches.map((b) => {
    const enrolledCount = seatMap[b._id.toString()] || 0;
    return {
      ...b.toJSON(),
      enrolledCount,
      seatsRemaining: Math.max(0, b.capacity - enrolledCount),
      isFull: enrolledCount >= b.capacity,
    };
  });
};

const assertAssignableTeacher = async (teacherId) => {
  const teacher = await User.findById(teacherId);
  if (!teacher) throw new AppError("Selected teacher was not found.", 404);
  if (teacher.role !== "teacher") throw new AppError("Selected user is not a teacher.", 400);
  if (!teacher.isActive) {
    throw new AppError("Selected teacher's account is deactivated.", 400);
  }
};

/**
 * GET /batches
 * admin   → all batches, filterable by status/search/subject
 * teacher → only batches assigned to them
 * student → only batches they are actively enrolled in
 */
export const getAllBatches = async (req, res, next) => {
  try {
    const { status = "all", search, subject } = req.query;
    const { role, _id: userId } = req.user;
    const query = {};

    if (role === "teacher") {
      query.teacher = userId;
      query.status = { $ne: "archived" };
    } else if (role === "student") {
      const enrolledBatchIds = await Enrollment.find({ student: userId, isActive: true }).distinct(
        "batch"
      );
      query._id = { $in: enrolledBatchIds };
      query.status = { $ne: "archived" };
    } else if (status === "all") {
      query.status = { $ne: "archived" };
    } else if (["upcoming", "active", "archived"].includes(status)) {
      query.status = status;
    }

    if (search) {
      const pattern = new RegExp(escapeRegex(search.trim()), "i");
      query.$or = [{ name: pattern }, { subject: pattern }];
    }
    if (subject && subject !== "all") {
      query.subject = new RegExp(`^${escapeRegex(subject.trim())}$`, "i");
    }

    const batches = await withRelations(Batch.find(query)).sort({ createdAt: -1 });

    // Status tab counts and subject options are only needed on the admin batch list
    let counts = null;
    if (role === "admin") {
      const [all, active, upcoming, archived, subjects] = await Promise.all([
        Batch.countDocuments({ status: { $ne: "archived" } }),
        Batch.countDocuments({ status: "active" }),
        Batch.countDocuments({ status: "upcoming" }),
        Batch.countDocuments({ status: "archived" }),
        Batch.distinct("subject"),
      ]);
      counts = { all, active, upcoming, archived, subjects: subjects.sort() };
    }

    res.status(200).json({
      success: true,
      data: { batches: await withSeatCounts(batches), counts },
      message: "Batches retrieved.",
    });
  } catch (error) {
    next(error);
  }
};

// GET /batches/:id — teachers only see their own; students only batches they're enrolled in
export const getBatchById = async (req, res, next) => {
  try {
    const batch = await withRelations(Batch.findById(req.params.id));
    if (!batch) return next(new AppError("Batch not found.", 404));

    const { role, _id: userId } = req.user;

    if (role === "teacher" && batch.teacher?._id.toString() !== userId.toString()) {
      return next(new AppError("You can only view batches assigned to you.", 403));
    }
    if (role === "student") {
      const enrolled = await Enrollment.exists({ student: userId, batch: batch._id, isActive: true });
      if (!enrolled) return next(new AppError("You are not enrolled in this batch.", 403));
    }

    const [withCounts] = await withSeatCounts([batch]);
    res.status(200).json({ success: true, data: { batch: withCounts }, message: "Batch retrieved." });
  } catch (error) {
    next(error);
  }
};

// POST /batches (admin)
export const createBatch = async (req, res, next) => {
  try {
    await assertAssignableTeacher(req.body.teacher);

    const batch = await Batch.create({
      ...req.body,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      createdBy: req.user._id,
    });

    const populated = await withRelations(Batch.findById(batch._id));
    const [withCounts] = await withSeatCounts([populated]);

    res.status(201).json({ success: true, data: { batch: withCounts }, message: "Batch created." });
  } catch (error) {
    next(error);
  }
};

// PUT /batches/:id (admin)
export const updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return next(new AppError("Batch not found.", 404));

    const updates = { ...req.body };

    if (updates.teacher && updates.teacher !== batch.teacher.toString()) {
      await assertAssignableTeacher(updates.teacher);
    }

    // Capacity can't drop below the number of students already enrolled
    if (updates.capacity !== undefined) {
      const enrolled = await Enrollment.countDocuments({ batch: batch._id, isActive: true });
      if (updates.capacity < enrolled) {
        return next(
          new AppError(
            `Capacity can't be lower than the ${enrolled} students already enrolled. Drop students first.`,
            400
          )
        );
      }
    }

    // Validate the date range against whichever values will be saved
    const start = updates.startDate !== undefined ? updates.startDate : batch.startDate;
    const end = updates.endDate !== undefined ? updates.endDate : batch.endDate;
    if (start && end && new Date(end) < new Date(start)) {
      return next(new AppError("End date cannot be before start date.", 400));
    }

    if (updates.startDate === "") updates.startDate = null;
    if (updates.endDate === "") updates.endDate = null;

    batch.set(updates);
    await batch.save(); // pre-validate hook keeps isArchived in sync with status

    const populated = await withRelations(Batch.findById(batch._id));
    const [withCounts] = await withSeatCounts([populated]);

    res.status(200).json({ success: true, data: { batch: withCounts }, message: "Batch updated." });
  } catch (error) {
    next(error);
  }
};

// PATCH /batches/:id/status (admin)
export const updateBatchStatus = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return next(new AppError("Batch not found.", 404));

    batch.status = req.body.status;
    await batch.save();

    const populated = await withRelations(Batch.findById(batch._id));
    const [withCounts] = await withSeatCounts([populated]);

    res.status(200).json({
      success: true,
      data: { batch: withCounts },
      message: `Batch marked as ${req.body.status}.`,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /batches/:id (admin) — soft archive, enrollments and attendance are kept
export const archiveBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return next(new AppError("Batch not found.", 404));

    batch.status = "archived";
    await batch.save();

    res.status(200).json({
      success: true,
      data: { id: batch._id, status: batch.status },
      message: "Batch archived.",
    });
  } catch (error) {
    next(error);
  }
};

// GET /batches/meta/teachers (admin) — options for the batch form
export const getTeacherOptions = async (req, res, next) => {
  try {
    const teachers = await User.find({ role: "teacher", isActive: true })
      .select("name email")
      .sort({ name: 1 });

    res.status(200).json({ success: true, data: { teachers }, message: "Teachers retrieved." });
  } catch (error) {
    next(error);
  }
};
