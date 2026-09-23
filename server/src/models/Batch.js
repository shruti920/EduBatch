import mongoose from "mongoose";

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
      required: [true, "Subject or discipline is required"],
      trim: true,
      maxlength: [100, "Subject cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    schedule: {
      days: {
        type: [String],
        enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        default: ["Mon", "Wed", "Fri"],
      },
      startTime: {
        type: String,
        trim: true,
        default: "07:00",
      },
      endTime: {
        type: String,
        trim: true,
        default: "09:30",
      },
      venue: {
        type: String,
        trim: true,
        default: "Hall 3 (Auditorium)",
      },
    },
    capacity: {
      type: Number,
      required: [true, "Batch capacity is required"],
      min: [1, "Batch capacity must be at least 1"],
      max: [500, "Batch capacity cannot exceed 500"],
    },
    fee: {
      type: Number,
      required: [true, "Batch fee is required"],
      min: [0, "Batch fee cannot be negative"],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned faculty lead is required"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["upcoming", "active", "archived"],
        message: "Status must be either upcoming, active, or archived",
      },
      default: "upcoming",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Batch creator reference is required"],
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-throughput queries
batchSchema.index({ teacher: 1, status: 1 });
batchSchema.index({ status: 1, isArchived: 1 });
batchSchema.index({ createdAt: -1 });

// Helper to remove internal fields in JSON output
batchSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;
