import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: [true, "Batch is required"],
    },
    enrolledAt: { type: Date, default: Date.now },
    paymentStatus: {
      type: String,
      enum: {
        values: ["pending", "paid", "waived"],
        message: "Payment status must be pending, paid, or waived",
      },
      default: "pending",
      index: true,
    },
    // Filled in by the payments module once a Razorpay payment is verified
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    // Soft drop: history is kept, the seat is released
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One enrollment record per student per batch (re-enrolling reactivates it)
enrollmentSchema.index({ student: 1, batch: 1 }, { unique: true });
enrollmentSchema.index({ batch: 1, isActive: 1 });
enrollmentSchema.index({ student: 1, isActive: 1 });

enrollmentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
