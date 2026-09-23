import User from "../models/User.js";
import { hashPassword } from "../utils/hash.js";
import { signToken } from "../utils/jwt.js";
import AppError from "../utils/AppError.js";

/**
 * POST /auth/register — public sign-up always creates a student.
 * Admin and teacher accounts are created by an admin (seed script for now),
 * so a client can never register itself into a higher role.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(
        new AppError("An account with this email already exists.", 409)
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || "",
      role: "student",
    });

    const token = signToken({ id: user._id, role: user.role });

    res.status(201).json({
      success: true,
      message: "Account created.",
      data: {
        user: user.toJSON(),
        token,
      },
    });
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
      return next(
        new AppError(
          "This account has been deactivated. Contact an admin.",
          403
        )
      );
    }

    const token = signToken({ id: user._id, role: user.role });

    res.status(200).json({
      success: true,
      message: "Logged in.",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /auth/me
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Profile retrieved.",
      data: {
        user: req.user.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};
