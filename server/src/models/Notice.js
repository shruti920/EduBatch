import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    // null = shown to everyone; otherwise only to that batch's students and teacher
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    // Plain text. Rendered as text (never as HTML), with line breaks kept.
    body: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pinned: { type: Boolean, default: false },
    // Hidden from students after this moment (null = no expiry)
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

noticeSchema.index({ batch: 1, pinned: -1, createdAt: -1 });
noticeSchema.index({ createdAt: -1 });

noticeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Notice = mongoose.model("Notice", noticeSchema);

export default Notice;
