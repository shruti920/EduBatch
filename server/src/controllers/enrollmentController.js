import Enrollment from "../models/Enrollment.js";
import Batch from "../models/Batch.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import escapeRegex from "../utils/escapeRegex.js";
import { sendEnrollmentEmail, sendInBackground } from "../services/emailService.js";

const amountFor = (paymentStatus, batch) => (paymentStatus === "paid" ? batch.fee : null);

const STUDENT_FIELDS = "name email phone avatar";
const BATCH_FIELDS = "name subject schedule fee status capacity teacher";

const populateEnrollment = (query) =>
  query.populate("student", STUDENT_FIELDS).populate("batch", BATCH_FIELDS);

const activeSeatCount = (batchId) => Enrollment.countDocuments({ batch: batchId, isActive: true });

const capacityError = (batch) =>
  new AppError(`"${batch.name}" is full (${batch.capacity}/${batch.capacity} seats).`, 409);

const assertSeatAvailable = async (batch) => {
  if ((await activeSeatCount(batch._id)) >= batch.capacity) throw capacityError(batch);
};

const confirmSeatOrRollback = async (batch, rollback) => {
  if ((await activeSeatCount(batch._id)) > batch.capacity) {
    await rollback();
    throw capacityError(batch);
  }
};

const assertEnrollableBatch = (batch) => {
  if (!batch) throw new AppError("Batch not found.", 404);
  if (batch.status === "archived") {
    throw new AppError("Archived batches can't take new enrollments.", 400);
  }
};

export const enrollStudent = async (req, res, next) => {
  try {
    const { student: studentId, batch: batchId, paymentStatus } = req.body;

    const student = await User.findById(studentId);
    if (!student) return next(new AppError("Student not found.", 404));
    if (student.role !== "student") {
      return next(new AppError("Only student accounts can be enrolled.", 400));
    }
    if (!student.isActive) {
      return next(new AppError("This student's account is deactivated.", 400));
    }

    const batch = await Batch.findById(batchId);
    assertEnrollableBatch(batch);

    const existing = await Enrollment.findOne({ student: student._id, batch: batch._id });
    if (existing?.isActive) {
      return next(new AppError(`${student.name} is already enrolled in this batch.`, 409));
    }

    await assertSeatAvailable(batch);

    let enrollment;
    let statusCode = 201;

    if (existing) {
      const previous = {
        enrolledAt: existing.enrolledAt,
        paymentStatus: existing.paymentStatus,
        amountPaid: existing.amountPaid,
        paidAt: existing.paidAt,
      };
      existing.isActive = true;
      existing.enrolledAt = new Date();
      if (!(existing.paymentStatus === "paid" && existing.payment)) {
        existing.paymentStatus = paymentStatus;
        existing.amountPaid = amountFor(paymentStatus, batch);
        existing.paidAt = paymentStatus === "paid" ? new Date() : null;
      }
      await existing.save();
      await confirmSeatOrRollback(batch, () =>
        Enrollment.updateOne({ _id: existing._id }, { isActive: false, ...previous })
      );
      enrollment = existing;
      statusCode = 200;
    } else {
      enrollment = await Enrollment.create({
        student: student._id,
        batch: batch._id,
        paymentStatus,
        amountPaid: amountFor(paymentStatus, batch),
        paidAt: paymentStatus === "paid" ? new Date() : null,
      });
      await confirmSeatOrRollback(batch, () => Enrollment.deleteOne({ _id: enrollment._id }));
    }

    const populated = await populateEnrollment(Enrollment.findById(enrollment._id));
    sendInBackground(() => sendEnrollmentEmail(student, batch));

    res.status(statusCode).json({
      success: true,
      data: { enrollment: populated },
      message: `${student.name} enrolled in ${batch.name}.`,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyEnrollments = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user._id, isActive: true })
      .populate({
        path: "batch",
        select: "-createdBy -__v",
        populate: { path: "teacher", select: "name email" },
      })
      .sort({ enrolledAt: -1 });

    res.status(200).json({ success: true, data: { enrollments }, message: "Enrollments retrieved." });
  } catch (error) {
    next(error);
  }
};

export const getBatchRoster = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.batchId).populate("teacher", "name email");
    if (!batch) return next(new AppError("Batch not found.", 404));

    if (
      req.user.role === "teacher" &&
      batch.teacher?._id.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("You can only view rosters for your own batches.", 403));
    }

    const roster = await Enrollment.find({ batch: batch._id, isActive: true })
      .populate("student", STUDENT_FIELDS)
      .sort({ enrolledAt: 1 });

    const count = (status) => roster.filter((e) => e.paymentStatus === status).length;

    res.status(200).json({
      success: true,
      data: {
        batch,
        roster,
        counts: {
          enrolled: roster.length,
          capacity: batch.capacity,
          seatsRemaining: Math.max(0, batch.capacity - roster.length),
          paid: count("paid"),
          pending: count("pending"),
          waived: count("waived"),
        },
      },
      message: "Roster retrieved.",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllEnrollments = async (req, res, next) => {
  try {
    const { batch, paymentStatus, search } = req.query;
    const query = { isActive: true };

    if (batch && batch !== "all") query.batch = batch;
    if (paymentStatus && paymentStatus !== "all") query.paymentStatus = paymentStatus;

    if (search?.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim()), "i");
      const studentIds = await User.find({
        role: "student",
        $or: [{ name: pattern }, { email: pattern }],
      }).distinct("_id");
      query.student = { $in: studentIds };
    }

    const [enrollments, statusRows] = await Promise.all([
      populateEnrollment(Enrollment.find(query)).sort({ enrolledAt: -1 }),
      Enrollment.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
      ]),
    ]);

    const byStatus = Object.fromEntries(statusRows.map((r) => [r._id, r.count]));
    const counts = {
      total: statusRows.reduce((sum, r) => sum + r.count, 0),
      paid: byStatus.paid || 0,
      pending: byStatus.pending || 0,
      waived: byStatus.waived || 0,
    };

    res.status(200).json({
      success: true,
      data: { enrollments, counts },
      message: "Enrollments retrieved.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateEnrollmentStatus = async (req, res, next) => {
  try {
    const { paymentStatus, isActive } = req.body;

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return next(new AppError("Enrollment not found.", 404));

    if (paymentStatus && paymentStatus !== "paid" && enrollment.paymentStatus === "paid" && enrollment.payment) {
      return next(
        new AppError(
          "This fee was paid online. Refund it from the Razorpay dashboard before changing its status.",
          409
        )
      );
    }

    const reactivating = isActive === true && !enrollment.isActive;
    const batch = await Batch.findById(enrollment.batch);
    if (!batch) return next(new AppError("Batch not found.", 404));

    if (reactivating) {
      assertEnrollableBatch(batch);
      await assertSeatAvailable(batch);
    }

    if (paymentStatus && paymentStatus !== enrollment.paymentStatus) {
      enrollment.paymentStatus = paymentStatus;
      if (!enrollment.payment) {
        enrollment.amountPaid = amountFor(paymentStatus, batch);
        enrollment.paidAt = paymentStatus === "paid" ? new Date() : null;
      }
    }
    if (isActive !== undefined) enrollment.isActive = isActive;
    await enrollment.save();

    if (reactivating) {
      await confirmSeatOrRollback(batch, () =>
        Enrollment.updateOne({ _id: enrollment._id }, { isActive: false })
      );
    }

    const populated = await populateEnrollment(Enrollment.findById(enrollment._id));

    res.status(200).json({
      success: true,
      data: { enrollment: populated },
      message: "Enrollment updated.",
    });
  } catch (error) {
    next(error);
  }
};

export const dropStudent = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return next(new AppError("Enrollment not found.", 404));

    enrollment.isActive = false;
    await enrollment.save();

    res.status(200).json({
      success: true,
      data: { id: enrollment._id, isActive: false },
      message: "Student dropped from batch.",
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentOptions = async (req, res, next) => {
  try {
    const students = await User.find({ role: "student", isActive: true })
      .select("name email phone")
      .sort({ name: 1 });

    res.status(200).json({ success: true, data: { students }, message: "Students retrieved." });
  } catch (error) {
    next(error);
  }
};
