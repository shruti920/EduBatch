import express from "express";
import {
  createNotice,
  deleteNotice,
  getNotices,
  getUnreadCount,
  markNoticesSeen,
  updateNotice,
} from "../controllers/noticeController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createNoticeSchema, updateNoticeSchema } from "../validations/noticeValidation.js";

const router = express.Router();

// Reads: every role, scoped in the controller
router.get("/", protect, getNotices);
router.get("/unread-count", protect, getUnreadCount);
router.post("/seen", protect, markNoticesSeen);

// Writes: admins and teachers (teachers limited to their own batches in the controller)
router.post("/", protect, restrictTo("admin", "teacher"), validateBody(createNoticeSchema), createNotice);
router.patch("/:id", protect, restrictTo("admin", "teacher"), validateBody(updateNoticeSchema), updateNotice);
router.delete("/:id", protect, restrictTo("admin", "teacher"), deleteNotice);

export default router;
