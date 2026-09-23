import mongoose from "mongoose";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Batch name is required"],
      trim: true,
      minlength: [3, "Batch name must be at least 3 characters"],
      maxlength: [120, "Batch name cannot exceed 120 characters"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [100, "Subject cannot exceed 100 characters"],
    },
    description: { type: String, trim: true, default: "" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    schedule: {
      days: {
        type: [String],
        enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        default: [],
      },
      startTime: { type: String, trim: true, match: [TIME_REGEX, "Use HH:MM (24h)"] },
      endTime: { type: String, trim: true, match: [TIME_REGEX, "Use HH:MM (24h)"] },
      venue: { type: String, trim: true, default: "" },
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
      max: [500, "Capacity cannot exceed 500"],
    },
    // Stored in INR; converted to paise only when creating a Razorpay order
    fee: {
      type: Number,
      required: [true, "Fee is required"],
      min: [0, "Fee cannot be negative"],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A teacher must be assigned"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["upcoming", "active", "archived"],
        message: "Status must be upcoming, active, or archived",
      },
      default: "upcoming",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Derived from status (see pre-validate hook). Kept as a field so existing
    // queries stay simple; it can never drift from status.
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

batchSchema.pre("validate", function () {
  this.isArchived = this.status === "archived";
});

batchSchema.index({ teacher: 1, status: 1 });
batchSchema.index({ createdAt: -1 });

batchSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;
