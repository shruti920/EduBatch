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
