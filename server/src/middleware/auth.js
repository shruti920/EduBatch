import { verifyToken } from "../utils/jwt.js";
import AppError from "../utils/AppError.js";
import User from "../models/User.js";

/**
 * Middleware to protect routes and verify JWT.
 */
export const protect = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError(
          "Authentication required. Please provide a valid Bearer token.",
          401
        )
      );
    }

    // Verify token
    const decoded = verifyToken(token);

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(
        new AppError(
          "The user account belonging to this token no longer exists.",
          401
        )
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return next(
        new AppError(
          "Your account has been deactivated. Please contact an administrator.",
          403
        )
      );
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid authentication token.", 401));
    }
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Authentication session expired. Please log in again.", 401));
    }
    next(error);
  }
};

/**
 * Middleware to restrict access to specific roles.
 * @param  {...string} roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          "Forbidden: You do not have the required permissions to perform this action.",
          403
        )
      );
    }
    next();
  };
};
