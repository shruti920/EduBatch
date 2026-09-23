import User from "../models/User.js";
import { hashPassword } from "../utils/hash.js";
import { signToken } from "../utils/jwt.js";
import AppError from "../utils/AppError.js";

/**
 * Register a new student account.
 * Note: Role is strictly forced to 'student' to prevent privilege escalation.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(
        new AppError("An account with this email address already exists.", 409)
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || "",
      role: "student", // Strictly hardcoded for public registration
    });

    const token = signToken({ id: user._id, role: user.role });

    res.status(201).json({
      success: true,
      message: "Student account registered successfully.",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate existing user and return JWT token.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password field which is hidden by default
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return next(new AppError("Invalid email or password.", 401));
    }

    if (!user.isActive) {
      return next(
        new AppError(
          "Your account has been deactivated. Please contact an administrator.",
          403
        )
      );
    }

    const token = signToken({ id: user._id, role: user.role });

    res.status(200).json({
      success: true,
      message: "Authentication successful.",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile of current authenticated user.
 */
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Current user profile retrieved.",
      data: {
        user: req.user.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};
