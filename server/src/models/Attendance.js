import mongoose from "mongoose";

const recordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["present", "absent", "late"],
        message: "Attendance status must be present, absent, or late",
      },
      required: [true, "Attendance status is required"],
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: [200, "Remarks cannot exceed 200 characters"],
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: [true, "Batch is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    records: {
      type: [recordSchema],
      default: [],
      validate: {
        validator: function (records) {
          // Reject duplicate student entries within the same roll call document
          const studentIds = records.map((r) => r.student.toString());
          return new Set(studentIds).size === studentIds.length;
        },
        message: "Duplicate student records detected in the same roll call.",
      },
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Marking faculty or admin reference is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One attendance document per batch per calendar day
attendanceSchema.index({ batch: 1, date: 1 }, { unique: true });

// History lookups and "my attendance" lookups
attendanceSchema.index({ batch: 1, createdAt: -1 });
attendanceSchema.index({ "records.student": 1 });

// Clean JSON representation
attendanceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
