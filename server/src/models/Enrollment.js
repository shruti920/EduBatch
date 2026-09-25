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
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    amountPaid: { type: Number, default: null, min: 0 },
    paidAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

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
