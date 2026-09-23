import express from "express";
import {
  enrollStudent,
  getMyEnrollments,
  getBatchRoster,
  getAllEnrollments,
  updateEnrollmentStatus,
  dropStudent,
  getCandidatesList,
} from "../controllers/enrollmentController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  enrollStudentSchema,
  updateEnrollmentStatusSchema,
} from "../validations/enrollmentValidation.js";

const router = express.Router();

// Candidate student self-desk route
router.get("/my", protect, restrictTo("student"), getMyEnrollments);

// Helper for Admin enrollment modal
router.get("/candidates", protect, restrictTo("admin"), getCandidatesList);

// Roster for a specific batch (Admin or assigned Teacher)
router.get("/batch/:batchId", protect, restrictTo("admin", "teacher"), getBatchRoster);

// Admin master ledger & enrollment actions
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
