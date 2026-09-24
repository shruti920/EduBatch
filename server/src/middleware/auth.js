import { verifyToken } from "../utils/jwt.js";
import AppError from "../utils/AppError.js";
import User from "../models/User.js";

// Verifies the Bearer token and attaches the current user to req.user
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
      return next(new AppError("Please log in to continue.", 401));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError("This account no longer exists.", 401));
    }
    if (!user.isActive) {
      return next(new AppError("This account has been deactivated. Contact an admin.", 403));
    }
    // Password changed / reset / "log out everywhere" since this token was issued
    if ((decoded.tv ?? 0) !== (user.tokenVersion || 0)) {
      return next(new AppError("Your session has ended. Please log in again.", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Role guard: always checked on the server, never trusted from the client
export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You don't have permission to do this.", 403));
    }
    next();
  };

/**
 * CSRF guard for the cookie-authenticated endpoints (/auth/refresh, /auth/logout).
 * A cross-site form or <img> can't set custom headers, and a cross-origin fetch that
 * sets one triggers a CORS preflight that our CORS policy rejects.
 */
export const requireXhrHeader = (req, res, next) => {
  if (req.get("x-requested-with") !== "XMLHttpRequest") {
    return next(new AppError("Missing X-Requested-With header.", 403));
  }
  next();
};
