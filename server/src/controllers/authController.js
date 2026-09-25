import crypto from "crypto";
import User from "../models/User.js";
import { hashPassword } from "../utils/hash.js";
import AppError from "../utils/AppError.js";
import { isDemoProtected } from "../config/env.js";
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  issueSession,
  revokeAllSessions,
  revokeByRawToken,
  rotateSession,
  sha256,
} from "../services/tokenService.js";
import {
  sendInBackground,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
} from "../services/emailService.js";

const RESET_TTL_MINUTES = () => Number(process.env.PASSWORD_RESET_TTL_MINUTES || 15);

// Same response shape everywhere a session starts: { user, token }
const sessionResponse = (res, status, message, user, token) =>
  res.status(status).json({ success: true, message, data: { user: user.toJSON(), token } });

const demoLocked = () =>
  new AppError("This is a shared demo account, so its password can't be changed. Register your own account to try this.", 403);

/**
 * POST /auth/register — public sign-up always creates a student.
 * Admin and teacher accounts are created by an admin (POST /users) or the seed script,
 * so a client can never register itself into a higher role.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("An account with this email already exists.", 409));
    }

    const user = await User.create({
      name,
      email,
      password: await hashPassword(password),
      phone: phone || "",
      role: "student",
    });

    const token = await issueSession(res, user, req);
    sessionResponse(res, 201, "Account created.", user, token);
  } catch (error) {
    next(error);
  }
};

// POST /auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return next(new AppError("Invalid email or password.", 401));
    }

    if (!user.isActive) {
      return next(new AppError("This account has been deactivated. Contact an admin.", 403));
    }

    const token = await issueSession(res, user, req);
    sessionResponse(res, 200, "Logged in.", user, token);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/refresh — exchanges the httpOnly refresh cookie for a new access token
 * and rotates the cookie. Also used by the client on page load to restore a session,
 * so the access token never has to live in localStorage.
 */
export const refresh = async (req, res, next) => {
  try {
    const { user, accessToken } = await rotateSession(res, req.cookies?.[REFRESH_COOKIE], req);
    sessionResponse(res, 200, "Session refreshed.", user, accessToken);
  } catch (error) {
    next(error);
  }
};

// POST /auth/logout — this device only. Always succeeds.
export const logout = async (req, res, next) => {
  try {
    await revokeByRawToken(req.cookies?.[REFRESH_COOKIE]);
    clearRefreshCookie(res);
    res.status(200).json({ success: true, data: null, message: "Logged out." });
  } catch (error) {
    next(error);
  }
};

// POST /auth/logout-all — every device, including access tokens already issued
export const logoutAll = async (req, res, next) => {
  try {
    await revokeAllSessions(req.user._id, "logout_all");
    clearRefreshCookie(res);
    res.status(200).json({ success: true, data: null, message: "Signed out of all devices." });
  } catch (error) {
    next(error);
  }
};

// GET /auth/me
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: "Profile retrieved.", data: { user: req.user.toJSON() } });
  } catch (error) {
    next(error);
  }
};

// PATCH /auth/me — name and phone only. Email and role can't be changed here; photos use /auth/me/avatar.
export const updateMe = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = req.user;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    await user.save();

    res.status(200).json({ success: true, message: "Profile updated.", data: { user: user.toJSON() } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /auth/change-password
 * Requires the current password. Afterwards every other session is ended and this
 * device gets a fresh session, so the user stays signed in here.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (isDemoProtected(req.user.email)) return next(demoLocked());

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.matchPassword(currentPassword))) {
      return next(new AppError("Current password is incorrect.", 400, { currentPassword: "Current password is incorrect" }));
    }

    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    await user.save();

    await revokeAllSessions(user._id, "password_changed");
    const fresh = await User.findById(user._id); // picks up the bumped tokenVersion
    const token = await issueSession(res, fresh, req);

    sendInBackground(() => sendPasswordChangedEmail(fresh));
    sessionResponse(res, 200, "Password changed. Other devices were signed out.", fresh, token);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/forgot-password
 * Always answers the same way, whether or not the email exists, so the form
 * can't be used to find out who has an account.
 */
export const forgotPassword = async (req, res, next) => {
  const generic = {
    success: true,
    data: null,
    message: "If an account exists for that email, a reset link is on its way. It expires in " +
      `${RESET_TTL_MINUTES()} minutes.`,
  };

  try {
    const user = await User.findOne({ email: req.body.email, isActive: true });

    if (user && !isDemoProtected(user.email)) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetTokenHash = sha256(rawToken);
      user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MINUTES() * 60 * 1000);
      await user.save({ validateBeforeSave: false });

      // Awaited so the log transport has the email before the response in tests;
      // sendEmail never throws, and the response doesn't reveal whether it worked.
      await sendPasswordResetEmail(user, rawToken, RESET_TTL_MINUTES());
    }

    res.status(200).json(generic);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/reset-password { token, password }
 * Single use: the token is cleared on success. Ends every existing session.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      passwordResetTokenHash: sha256(token),
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires");

    if (!user) {
      return next(new AppError("This reset link is invalid or has expired. Request a new one.", 400));
    }
    if (!user.isActive) {
      return next(new AppError("This account has been deactivated. Contact an admin.", 403));
    }

    user.password = await hashPassword(password);
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await user.save();

    await revokeAllSessions(user._id, "password_changed");
    clearRefreshCookie(res);
    sendInBackground(() => sendPasswordChangedEmail(user));

    res.status(200).json({ success: true, data: null, message: "Password updated. Log in with your new password." });
  } catch (error) {
    next(error);
  }
};
