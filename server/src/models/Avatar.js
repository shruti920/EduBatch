import mongoose from "mongoose";

const avatarSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    key: { type: String, required: true },
    contentType: { type: String, enum: ["image/webp", "image/png", "image/jpeg"], required: true },
    data: { type: Buffer, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

const Avatar = mongoose.model("Avatar", avatarSchema);

export default Avatar;
