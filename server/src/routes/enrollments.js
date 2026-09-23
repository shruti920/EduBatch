import express from "express";
import {
  enrollStudent,
  getMyEnrollments,
  getBatchRoster,
  getAllEnrollments,
  updateEnrollmentStatus,
  dropStudent,
  getStudentOptions,
} from "../controllers/enrollmentController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  enrollStudentSchema,
  updateEnrollmentStatusSchema,
} from "../validations/enrollmentValidation.js";

const router = express.Router();

// Student: own enrollments
router.get("/my", protect, restrictTo("student"), getMyEnrollments);

// Student options for the enroll form (admin)
router.get("/students", protect, restrictTo("admin"), getStudentOptions);

// Roster for one batch (admin, or that batch's teacher)
router.get("/batch/:batchId", protect, restrictTo("admin", "teacher"), getBatchRoster);

// Admin: all enrollments and enrollment actions
router.get("/", protect, restrictTo("admin"), getAllEnrollments);
router.post(
  "/",
  protect,
  restrictTo("admin"),
  validateBody(enrollStudentSchema),
  enrollStudent
);
router.patch(
  "/:id/status",
  protect,
  restrictTo("admin"),
  validateBody(updateEnrollmentStatusSchema),
  updateEnrollmentStatus
);
router.delete("/:id", protect, restrictTo("admin"), dropStudent);

export default router;
