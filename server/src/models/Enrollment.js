import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Candidate student reference is required"],
      index: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: [true, "Cohort batch reference is required"],
      index: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
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
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: A student can only have ONE enrollment record per batch
enrollmentSchema.index({ student: 1, batch: 1 }, { unique: true });

// Compound indexes for rapid capacity checks and roster lookups
enrollmentSchema.index({ batch: 1, isActive: 1 });
enrollmentSchema.index({ student: 1, isActive: 1 });

// Clean JSON representation
enrollmentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
