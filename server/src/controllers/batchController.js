import Batch from "../models/Batch.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

/**
 * Get all batches with role-aware scoping, status filters, and search.
 */
export const getAllBatches = async (req, res, next) => {
  try {
    const { status, search, subject } = req.query;
    const query = {};

    // 1. Role-based scoping
    if (req.user.role === "teacher") {
      query.teacher = req.user._id;
      query.isArchived = false;
    } else if (req.user.role === "student") {
      query.isArchived = false;
      query.status = { $in: ["active", "upcoming"] };
    } else {
      // Admin scoping
      if (status && status !== "all") {
        query.status = status;
        if (status === "archived") {
          query.isArchived = true;
        } else {
          query.isArchived = false;
        }
      } else if (!status || status === "all") {
        // By default show all non-archived in 'all' view, unless specifically archived tab
        query.isArchived = false;
      }
    }

    // 2. Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    // 3. Subject filter
    if (subject && subject !== "All Disciplines") {
      query.subject = { $regex: subject, $options: "i" };
    }

    // Execute query
    const batches = await Batch.find(query)
      .populate("teacher", "name email phone avatar")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    // Compute status counts for Admin navigation tabs
    let counts = { all: 0, active: 0, upcoming: 0, archived: 0 };
    if (req.user.role === "admin") {
      const [allCount, activeCount, upcomingCount, archivedCount] = await Promise.all([
        Batch.countDocuments({ isArchived: false }),
        Batch.countDocuments({ status: "active", isArchived: false }),
        Batch.countDocuments({ status: "upcoming", isArchived: false }),
        Batch.countDocuments({ isArchived: true }),
      ]);
      counts = {
        all: allCount,
        active: activeCount,
        upcoming: upcomingCount,
        archived: archivedCount,
      };
    } else if (req.user.role === "teacher") {
      const [allCount, activeCount, upcomingCount] = await Promise.all([
        Batch.countDocuments({ teacher: req.user._id, isArchived: false }),
        Batch.countDocuments({ teacher: req.user._id, status: "active", isArchived: false }),
        Batch.countDocuments({ teacher: req.user._id, status: "upcoming", isArchived: false }),
      ]);
      counts = { all: allCount, active: activeCount, upcoming: upcomingCount, archived: 0 };
    }

    res.status(200).json({
      success: true,
      message: "Batches retrieved successfully.",
      data: {
        batches,
        counts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single batch by ID with populated teacher and createdBy details.
 */
export const getBatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batch = await Batch.findById(id)
      .populate("teacher", "name email phone avatar")
      .populate("createdBy", "name email");

    if (!batch) {
      return next(new AppError("Batch not found with the requested ID.", 404));
    }

    // Teacher authorization check: can only view own batches
    if (
      req.user.role === "teacher" &&
      batch.teacher?._id?.toString() !== req.user._id.toString()
    ) {
      return next(
        new AppError("You do not have permission to view this cohort's details.", 403)
      );
    }

    res.status(200).json({
      success: true,
      message: "Batch details retrieved.",
      data: {
        batch,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new academic batch (Admin only).
 * Validates that teacher exists and has 'teacher' role.
 */
export const createBatch = async (req, res, next) => {
  try {
    const { name, subject, description, startDate, endDate, schedule, capacity, fee, teacher, status } = req.body;

    // Verify assigned teacher exists, is active, and has 'teacher' role
    const teacherUser = await User.findById(teacher);
    if (!teacherUser) {
      return next(new AppError("Assigned faculty lead not found.", 404));
    }
    if (teacherUser.role !== "teacher") {
      return next(
        new AppError("Assigned user must possess the 'teacher' faculty role.", 400)
      );
    }
    if (!teacherUser.isActive) {
      return next(
        new AppError("Cannot assign a deactivated faculty member to a new cohort.", 400)
      );
    }

    // Verify date sequence if both dates provided
    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        return next(new AppError("End date cannot precede the start date.", 400));
      }
    }

    const batch = await Batch.create({
      name,
      subject,
      description: description || "",
      startDate: startDate || null,
      endDate: endDate || null,
      schedule: schedule || undefined,
      capacity,
      fee,
      teacher,
      status: status || "upcoming",
      createdBy: req.user._id,
      isArchived: false,
    });

    const populatedBatch = await Batch.findById(batch._id)
      .populate("teacher", "name email phone avatar")
      .populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "New batch registered successfully in curriculum ledger.",
      data: {
        batch: populatedBatch,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing batch (Admin only).
 */
export const updateBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findById(id);

    if (!batch) {
      return next(new AppError("Batch not found with the requested ID.", 404));
    }

    // If teacher is being modified, validate teacher
    if (req.body.teacher && req.body.teacher !== batch.teacher.toString()) {
      const teacherUser = await User.findById(req.body.teacher);
      if (!teacherUser) {
        return next(new AppError("Assigned faculty lead not found.", 404));
      }
      if (teacherUser.role !== "teacher") {
        return next(
          new AppError("Assigned user must possess the 'teacher' faculty role.", 400)
        );
      }
      if (!teacherUser.isActive) {
        return next(
          new AppError("Cannot assign a deactivated faculty member to a cohort.", 400)
        );
      }
    }

    // Verify date sequence
    const effectiveStartDate = req.body.startDate !== undefined ? req.body.startDate : batch.startDate;
    const effectiveEndDate = req.body.endDate !== undefined ? req.body.endDate : batch.endDate;
    if (effectiveStartDate && effectiveEndDate) {
      if (new Date(effectiveEndDate) < new Date(effectiveStartDate)) {
        return next(new AppError("End date cannot precede the start date.", 400));
      }
    }

    // Apply updates
    Object.assign(batch, req.body);
    await batch.save();

    const updatedBatch = await Batch.findById(id)
      .populate("teacher", "name email phone avatar")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Batch configuration updated successfully.",
      data: {
        batch: updatedBatch,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Quick status update (upcoming | active | archived) (Admin only).
 */
export const updateBatchStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const batch = await Batch.findById(id);
    if (!batch) {
      return next(new AppError("Batch not found.", 404));
    }

    batch.status = status;
    if (status === "archived") {
      batch.isArchived = true;
    } else {
      batch.isArchived = false;
    }

    await batch.save();

    const updatedBatch = await Batch.findById(id)
      .populate("teacher", "name email phone avatar");

    res.status(200).json({
      success: true,
      message: `Batch status changed to ${status}.`,
      data: {
        batch: updatedBatch,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft archive batch (Admin only).
 */
export const archiveBatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const batch = await Batch.findById(id);
    if (!batch) {
      return next(new AppError("Batch not found.", 404));
    }

    batch.isArchived = true;
    batch.status = "archived";
    await batch.save();

    res.status(200).json({
      success: true,
      message: "Batch archived successfully in ledger. Historical records preserved.",
      data: {
        id: batch._id,
        isArchived: true,
        status: "archived",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to fetch active faculty leads for dropdown selection (Admin only).
 */
export const getFacultyList = async (req, res, next) => {
  try {
    const teachers = await User.find({ role: "teacher", isActive: true })
      .select("name email phone avatar")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Active faculty leads retrieved.",
      data: {
        teachers,
      },
    });
  } catch (error) {
    next(error);
  }
};
