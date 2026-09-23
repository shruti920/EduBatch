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

// Student: own attendance summary
router.get("/my", protect, restrictTo("student"), getMyAttendance);

// One batch, one date (admin, or that batch's teacher)
router.get(
  "/batch/:batchId/date/:date",
  protect,
  restrictTo("admin", "teacher"),
  getBatchAttendanceByDate
);

// Session history for a batch (admin, or that batch's teacher)
router.get(
  "/batch/:batchId",
  protect,
  restrictTo("admin", "teacher"),
  getBatchAttendance
);

// Mark or update a day's attendance (admin, or that batch's teacher)
router.post(
  "/",
  protect,
  restrictTo("admin", "teacher"),
  validateBody(markAttendanceSchema),
  markAttendance
);

export default router;
