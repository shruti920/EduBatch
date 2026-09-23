import Notice from "../models/Notice.js";
import Batch from "../models/Batch.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

const PAGE_SIZE = 20;

// "2026-10-01" means "until the end of 1 Oct" in IST; full timestamps are used as-is
const parseExpiry = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999+05:30`) : new Date(value);
};

/**
 * Builds the Mongo filter for notices this user may see.
 * - admin:   everything
 * - teacher: everyone-notices + their own non-archived batches
 * - student: everyone-notices + batches they're actively enrolled in (non-archived),
 *            and never expired notices
 */
const visibilityFilter = async (user) => {
  if (user.role === "admin") return {};

  let batchIds;
  if (user.role === "teacher") {
    batchIds = await Batch.find({ teacher: user._id, status: { $ne: "archived" } }).distinct("_id");
  } else {
    const enrolled = await Enrollment.find({ student: user._id, isActive: true }).distinct("batch");
    batchIds = await Batch.find({ _id: { $in: enrolled }, status: { $ne: "archived" } }).distinct("_id");
  }

  const filter = { $or: [{ batch: null }, { batch: { $in: batchIds } }] };
  if (user.role === "student") {
    filter.$and = [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }];
  }
  return filter;
};

const populateNotice = (query) =>
  query.populate("batch", "name subject").populate("createdBy", "name role");

// Author, or any admin
const canManage = (user, notice) =>
  user.role === "admin" || notice.createdBy?.toString() === user._id.toString();

/**
 * GET /notices?batch=&before=&limit=
 * Pinned first, then newest. Paging: pass the last item's createdAt as `before`.
 */
export const getNotices = async (req, res, next) => {
  try {
    const { batch, before } = req.query;
    const limit = Math.min(Number(req.query.limit) || PAGE_SIZE, 50);
    const filter = await visibilityFilter(req.user);

    if (batch === "everyone") filter.batch = null;
    else if (batch && batch !== "all") filter.batch = batch;

    // Pinned notices are always returned on the first page, never paged
    const pinnedQuery = before ? [] : populateNotice(Notice.find({ ...filter, pinned: true })).sort({ createdAt: -1 });
    const recentFilter = { ...filter, pinned: false, ...(before && { createdAt: { $lt: new Date(before) } }) };

    const [pinned, recent] = await Promise.all([
      pinnedQuery,
      populateNotice(Notice.find(recentFilter)).sort({ createdAt: -1 }).limit(limit + 1),
    ]);

    const hasMore = recent.length > limit;
    const page = recent.slice(0, limit);

    res.status(200).json({
      success: true,
      data: {
        notices: [...pinned, ...page],
        nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
      },
      message: "Notices retrieved.",
    });
  } catch (error) {
    next(error);
  }
};

// GET /notices/unread-count — drives the sidebar badge
export const getUnreadCount = async (req, res, next) => {
  try {
    const filter = await visibilityFilter(req.user);
    const since = req.user.noticesSeenAt;
    const count = await Notice.countDocuments({
      ...filter,
      ...(since && { createdAt: { $gt: since } }),
      createdBy: { $ne: req.user._id }, // your own posts are never "unread"
    });
    res.status(200).json({ success: true, data: { count }, message: "Unread count retrieved." });
  } catch (error) {
    next(error);
  }
};

// POST /notices/seen — marks everything up to now as read
export const markNoticesSeen = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { noticesSeenAt: new Date() });
    res.status(200).json({ success: true, data: { count: 0 }, message: "Marked as read." });
  } catch (error) {
    next(error);
  }
};

// POST /notices (admin, teacher)
export const createNotice = async (req, res, next) => {
  try {
    const { batch: batchId, title, body, pinned, expiresAt } = req.body;
    const { role, _id: userId } = req.user;

    if (!batchId) {
      if (role !== "admin") {
        return next(new AppError("Teachers can post only to their own batches. Choose a batch.", 403));
      }
    } else {
      const batch = await Batch.findById(batchId);
      if (!batch) return next(new AppError("Batch not found.", 404));
      if (role === "teacher" && batch.teacher.toString() !== userId.toString()) {
        return next(new AppError("You can post only to batches you teach.", 403));
      }
      if (batch.status === "archived") {
        return next(new AppError("This batch is archived.", 400));
      }
    }

    const expiry = parseExpiry(expiresAt);
    if (expiry && expiry <= new Date()) {
      return next(new AppError("The “show until” date must be in the future.", 400));
    }

    const notice = await Notice.create({
      batch: batchId || null,
      title,
      body,
      pinned,
      expiresAt: expiry ?? null,
      createdBy: userId,
    });

    const populated = await populateNotice(Notice.findById(notice._id));
    res.status(201).json({ success: true, data: { notice: populated }, message: "Notice posted." });
  } catch (error) {
    next(error);
  }
};

// PATCH /notices/:id (author or admin)
export const updateNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return next(new AppError("Notice not found.", 404));
    if (!canManage(req.user, notice)) {
      return next(new AppError("You can edit only notices you posted.", 403));
    }

    const updates = { ...req.body };
    if ("expiresAt" in updates) {
      updates.expiresAt = parseExpiry(updates.expiresAt);
      if (updates.expiresAt && updates.expiresAt <= new Date()) {
        return next(new AppError("The “show until” date must be in the future.", 400));
      }
    }

    notice.set(updates);
    await notice.save();

    const populated = await populateNotice(Notice.findById(notice._id));
    res.status(200).json({ success: true, data: { notice: populated }, message: "Notice updated." });
  } catch (error) {
    next(error);
  }
};

// DELETE /notices/:id (author or admin)
export const deleteNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return next(new AppError("Notice not found.", 404));
    if (!canManage(req.user, notice)) {
      return next(new AppError("You can delete only notices you posted.", 403));
    }
    await Notice.deleteOne({ _id: notice._id });
    res.status(200).json({ success: true, data: { id: notice._id }, message: "Notice deleted." });
  } catch (error) {
    next(error);
  }
};
