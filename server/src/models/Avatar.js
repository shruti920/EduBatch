import mongoose from "mongoose";

/**
 * Profile photos, cropped and resized in the browser (256x256, ~20 KB) before upload.
 * Kept out of the User document so user lists stay small, and served from
 * /api/v1/avatars/:userId/:key.:ext with long-lived caching. `key` is random and
 * changes on every upload, which makes the URL unguessable and cache-safe.
 */
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
