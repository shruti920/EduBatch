import Enrollment from "../models/Enrollment.js";
import Batch from "../models/Batch.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

/**
 * Enroll a student into a batch with server-side hard capacity enforcement.
 */
export const enrollStudent = async (req, res, next) => {
  try {
    const { student, batch: batchId, paymentStatus } = req.body;

    // 1. Verify student exists and has 'student' role
    const studentUser = await User.findById(student);
    if (!studentUser) {
      return next(new AppError("Candidate student account not found.", 404));
    }
    if (studentUser.role !== "student") {
      return next(
        new AppError("Only accounts with the 'student' role can be enrolled in cohorts.", 400)
      );
    }
    if (!studentUser.isActive) {
      return next(
        new AppError("Cannot enroll a deactivated candidate account.", 400)
      );
    }

    // 2. Verify batch exists and is open for enrollment
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return next(new AppError("Cohort batch not found.", 404));
    }
    if (batch.isArchived || batch.status === "archived") {
      return next(
        new AppError("Cannot enroll candidates into an archived cohort.", 400)
      );
    }

    // 3. Check for existing enrollment record
    const existingEnrollment = await Enrollment.findOne({
      student: studentUser._id,
      batch: batch._id,
    });

    if (existingEnrollment) {
      if (existingEnrollment.isActive) {
        return next(
          new AppError(
            `Candidate "${studentUser.name}" is already actively enrolled in this cohort.`,
            400
          )
        );
      } else {
        // Reactivate soft-dropped enrollment if capacity permits
        const activeCount = await Enrollment.countDocuments({
          batch: batch._id,
          isActive: true,
        });

        if (activeCount >= batch.capacity) {
          return next(
            new AppError(
              `Capacity reached: "${batch.name}" has reached its maximum quota of ${batch.capacity} candidates.`,
              400
            )
          );
        }

        existingEnrollment.isActive = true;
        existingEnrollment.enrolledAt = new Date();
        if (paymentStatus) {
          existingEnrollment.paymentStatus = paymentStatus;
        }
        await existingEnrollment.save();

        const reactivated = await Enrollment.findById(existingEnrollment._id)
          .populate("student", "name email phone avatar")
          .populate("batch", "name subject schedule fee venue");

        return res.status(200).json({
          success: true,
          message: `Reactivated enrollment for candidate "${studentUser.name}".`,
          data: {
            enrollment: reactivated,
          },
        });
      }
    }

    // 4. Hard Capacity Enforcement Check
    const activeCount = await Enrollment.countDocuments({
      batch: batch._id,
      isActive: true,
    });

    if (activeCount >= batch.capacity) {
      return next(
        new AppError(
          `Capacity reached: "${batch.name}" has reached its maximum quota of ${batch.capacity} candidates.`,
          400
        )
      );
    }

    // 5. Create new enrollment
    const newEnrollment = await Enrollment.create({
      student: studentUser._id,
      batch: batch._id,
      paymentStatus: paymentStatus || "pending",
      enrolledAt: new Date(),
      isActive: true,
    });

    const populatedEnrollment = await Enrollment.findById(newEnrollment._id)
      .populate("student", "name email phone avatar")
      .populate("batch", "name subject schedule fee venue");

    res.status(201).json({
      success: true,
      message: `Candidate "${studentUser.name}" enrolled successfully into "${batch.name}".`,
      data: {
        enrollment: populatedEnrollment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get logged-in candidate's own active enrollments.
 */
export const getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.user._id,
      isActive: true,
    })
      .populate({
        path: "batch",
        populate: {
          path: "teacher",
          select: "name email phone avatar",
        },
      })
      .sort({ enrolledAt: -1 });

    res.status(200).json({
      success: true,
      message: "Candidate enrollments retrieved.",
      data: {
        enrollments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get full candidate roster for a specific batch (Admin or assigned Teacher).
 */
export const getBatchRoster = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findById(batchId).populate("teacher", "name email");
    if (!batch) {
      return next(new AppError("Cohort batch not found.", 404));
    }

    // Permission check: only Admin or assigned Teacher can inspect the full cohort roster
    if (req.user.role === "student") {
      return next(
        new AppError(
          "Forbidden: Candidates are not permitted to access administrative rosters.",
          403
        )
      );
    }

    // Permission check for teachers: must be assigned to this batch
    if (
      req.user.role === "teacher" &&
      batch.teacher?._id?.toString() !== req.user._id.toString()
    ) {
      return next(
        new AppError(
          "Forbidden: You can only inspect rosters for cohorts assigned under your charge.",
          403
        )
      );
    }

    const roster = await Enrollment.find({
      batch: batch._id,
      isActive: true,
    })
      .populate("student", "name email phone avatar")
      .sort({ enrolledAt: 1 });

    const counts = {
      enrolled: roster.length,
      capacity: batch.capacity,
      seatsRemaining: Math.max(0, batch.capacity - roster.length),
      paid: roster.filter((e) => e.paymentStatus === "paid").length,
      pending: roster.filter((e) => e.paymentStatus === "pending").length,
      waived: roster.filter((e) => e.paymentStatus === "waived").length,
    };

    res.status(200).json({
      success: true,
      message: `Roster for ${batch.name} retrieved.`,
      data: {
        batch,
        roster,
        counts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all enrollments across system (Admin only, with filters).
 */
export const getAllEnrollments = async (req, res, next) => {
  try {
    const { batch, paymentStatus, search } = req.query;
    const query = { isActive: true };

    if (batch && batch !== "all") {
      query.batch = batch;
    }

    if (paymentStatus && paymentStatus !== "all") {
      query.paymentStatus = paymentStatus;
    }

    let enrollments = await Enrollment.find(query)
      .populate("student", "name email phone avatar")
      .populate("batch", "name subject schedule fee status venue")
      .sort({ enrolledAt: -1 });

    // In-memory filter for candidate name or email if search provided
    if (search) {
      const lowerSearch = search.toLowerCase();
      enrollments = enrollments.filter(
        (e) =>
          e.student?.name?.toLowerCase().includes(lowerSearch) ||
          e.student?.email?.toLowerCase().includes(lowerSearch) ||
          e.batch?.name?.toLowerCase().includes(lowerSearch)
      );
    }

    // Compute aggregate metrics
    const [totalCount, paidCount, pendingCount, waivedCount] = await Promise.all([
      Enrollment.countDocuments({ isActive: true }),
      Enrollment.countDocuments({ isActive: true, paymentStatus: "paid" }),
      Enrollment.countDocuments({ isActive: true, paymentStatus: "pending" }),
      Enrollment.countDocuments({ isActive: true, paymentStatus: "waived" }),
    ]);

    res.status(200).json({
      success: true,
      message: "Enrollments retrieved successfully.",
      data: {
        enrollments,
        counts: {
          total: totalCount,
          paid: paidCount,
          pending: pendingCount,
          waived: waivedCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update enrollment status (e.g. paymentStatus or isActive) (Admin only).
 */
export const updateEnrollmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus, isActive } = req.body;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return next(new AppError("Enrollment record not found.", 404));
    }

    if (paymentStatus) {
      enrollment.paymentStatus = paymentStatus;
    }
    if (isActive !== undefined) {
      enrollment.isActive = isActive;
    }

    await enrollment.save();

    const updated = await Enrollment.findById(id)
      .populate("student", "name email phone avatar")
      .populate("batch", "name subject schedule fee venue");

    res.status(200).json({
      success: true,
      message: "Enrollment updated successfully.",
      data: {
        enrollment: updated,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft drop a student from a batch (Admin only).
 */
export const dropStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return next(new AppError("Enrollment record not found.", 404));
    }

    enrollment.isActive = false;
    await enrollment.save();

    res.status(200).json({
      success: true,
      message: "Candidate has been soft-dropped from cohort. Roster vacancy created.",
      data: {
        id: enrollment._id,
        isActive: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to fetch active candidate students for Admin dropdown selection.
 */
export const getCandidatesList = async (req, res, next) => {
  try {
    const students = await User.find({ role: "student", isActive: true })
      .select("name email phone avatar")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Active candidates retrieved.",
      data: {
        students,
      },
    });
  } catch (error) {
    next(error);
  }
};
