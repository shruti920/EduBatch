import mongoose from "mongoose";

/**
 * One document per issued refresh token. Only a SHA-256 hash is stored, so a
 * database leak doesn't hand out live sessions.
 *
 * Rotation: every /auth/refresh revokes the presented token and issues a new one
 * in the same `family`. If an already-rotated token is presented again (outside a
 * short grace window for parallel tabs), it was stolen or replayed: the whole
 * family is revoked and that login session ends everywhere.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: ["rotated", "logout", "logout_all", "reuse_detected", "password_changed", "deactivated", null],
      default: null,
    },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
  },
  { timestamps: true }
);

// MongoDB deletes expired tokens on its own
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;
