import express from "express";
import {
  changePassword,
  forgotPassword,
  getMe,
  login,
  logout,
  logoutAll,
  refresh,
  register,
  resetPassword,
  updateMe,
} from "../controllers/authController.js";
import { protect, requireXhrHeader } from "../middleware/auth.js";
import { AVATAR_MAX_BYTES, deleteAvatar, uploadAvatar } from "../controllers/avatarController.js";
import { validateBody } from "../middleware/validate.js";
import {
  authLimiter,
  changePasswordLimiter,
  forgotPasswordLimiter,
  refreshLimiter,
  resetPasswordLimiter,
} from "../middleware/rateLimiters.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validations/authValidation.js";

const router = express.Router();

// Public
router.post("/register", authLimiter, validateBody(registerSchema), register);
router.post("/login", authLimiter, validateBody(loginSchema), login);
router.post("/forgot-password", forgotPasswordLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", resetPasswordLimiter, validateBody(resetPasswordSchema), resetPassword);

// Cookie-authenticated (refresh token), CSRF-guarded
router.post("/refresh", refreshLimiter, requireXhrHeader, refresh);
router.post("/logout", requireXhrHeader, logout);

// Bearer-authenticated
router.get("/me", protect, getMe);
router.patch("/me", protect, validateBody(updateProfileSchema), updateMe);
router.patch("/change-password", protect, changePasswordLimiter, validateBody(changePasswordSchema), changePassword);
router.post("/logout-all", protect, logoutAll);
// Raw image bytes (the browser sends a cropped 256x256 WebP). Type is checked from the bytes.
router.put(
  "/me/avatar",
  protect,
  express.raw({ type: ["image/webp", "image/png", "image/jpeg", "application/octet-stream"], limit: AVATAR_MAX_BYTES }),
  uploadAvatar
);
router.delete("/me/avatar", protect, deleteAvatar);

export default router;
