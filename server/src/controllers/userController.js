import User from "../models/User.js";
import Batch from "../models/Batch.js";
import Enrollment from "../models/Enrollment.js";
import AppError from "../utils/AppError.js";
import escapeRegex from "../utils/escapeRegex.js";
import { hashPassword } from "../utils/hash.js";
import { isDemoProtected } from "../config/env.js";
import { revokeAllSessions } from "../services/tokenService.js";
import { sendInBackground, sendWelcomeEmail } from "../services/emailService.js";

const PAGE_SIZE = 20;

/**
 * GET /users?role=&status=&search=&page= (admin)
 * Paged list plus per-role counts for the filter tabs.
 */
export const listUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const query = {};

    if (["admin", "teacher", "student"].includes(role)) query.role = role;
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;
    if (search?.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim().slice(0, 100)), "i");
      query.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }

    const [users, total, roleRows] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      User.countDocuments(query),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    ]);

    const counts = { admin: 0, teacher: 0, student: 0 };
    roleRows.forEach((r) => {
      counts[r._id] = r.count;
    });

    res.status(200).json({
      success: true,
      data: {
        users,
        counts,
        pagination: { page, pageSize: PAGE_SIZE, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
      },
      message: "Users retrieved.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /users (admin) — create a teacher or student account.
 * The admin sets the first password and shares it; the user is emailed a welcome
 * note (never the password) and can change it from their profile.
 */
export const createUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, password } = req.body;

    if (await User.exists({ email })) {
      return next(new AppError("An account with this email already exists.", 409));
    }

    const user = await User.create({
      name,
      email,
      phone,
      role,
      password: await hashPassword(password),
      createdBy: req.user._id,
    });

    sendInBackground(() => sendWelcomeEmail(user, req.user.name));

    res.status(201).json({
      success: true,
      data: { user },
      message: `${role === "teacher" ? "Teacher" : "Student"} account created for ${user.name}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /users/:id/status { isActive } (admin)
 * Deactivating ends all of that user's sessions immediately.
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found.", 404));

    if (user._id.equals(req.user._id)) {
      return next(new AppError("You can't change your own account status.", 400));
    }
    if (user.role === "admin") {
      return next(new AppError("Admin accounts can't be deactivated from the app.", 403));
    }
    if (isDemoProtected(user.email)) {
      return next(new AppError("Shared demo accounts can't be deactivated.", 403));
    }
    if (user.isActive === isActive) {
      return res.status(200).json({ success: true, data: { user }, message: "No change." });
    }

    let warning = null;
    if (!isActive && user.role === "teacher") {
      const assigned = await Batch.countDocuments({ teacher: user._id, status: { $ne: "archived" } });
      if (assigned > 0) {
        return next(
          new AppError(
            `${user.name} teaches ${assigned} open batch${assigned > 1 ? "es" : ""}. Assign another teacher first.`,
            409
          )
        );
      }
    }
    if (!isActive && user.role === "student") {
      const seats = await Enrollment.countDocuments({ student: user._id, isActive: true });
      // Seats are kept on purpose (history, fees); the admin decides whether to drop them
      if (seats > 0) warning = `${user.name} still holds ${seats} seat${seats > 1 ? "s" : ""}. Drop them from Enrollments to free the seats.`;
    }

    user.isActive = isActive;
    await user.save();
    if (!isActive) await revokeAllSessions(user._id, "deactivated");

    res.status(200).json({
      success: true,
      data: { user: await User.findById(user._id), warning },
      message: isActive ? `${user.name} can log in again.` : `${user.name} was deactivated and signed out.`,
    });
  } catch (error) {
    next(error);
  }
};
