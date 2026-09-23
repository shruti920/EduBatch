import express from "express";
import {
  markAttendance,
  getBatchAttendance,
  getBatchAttendanceByDate,
  getMyAttendance,
} from "../controllers/attendanceController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { markAttendanceSchema } from "../validations/attendanceValidation.js";

const router = express.Router();

// Candidate Student personal attendance summary and history
router.get("/my", protect, restrictTo("student"), getMyAttendance);

// Single date attendance check for a batch (Admin or assigned Teacher)
router.get(
  "/batch/:batchId/date/:date",
  protect,
  restrictTo("admin", "teacher"),
  getBatchAttendanceByDate
);

// Cohort historical attendance register sessions (Admin or assigned Teacher)
router.get(
  "/batch/:batchId",
  protect,
  restrictTo("admin", "teacher"),
  getBatchAttendance
);

// Submit or revise a roll call register (Admin or assigned Teacher)
router.post(
  "/",
  protect,
  restrictTo("admin", "teacher"),
  validateBody(markAttendanceSchema),
  markAttendance
);

export default router;
