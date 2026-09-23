import express from "express";
import {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  updateBatchStatus,
  archiveBatch,
  getTeacherOptions,
} from "../controllers/batchController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  createBatchSchema,
  updateBatchSchema,
  batchStatusSchema,
} from "../validations/batchValidation.js";

const router = express.Router();

// Teacher options for the batch form (admin)
router.get("/meta/teachers", protect, restrictTo("admin"), getTeacherOptions);

// Role-scoped reads
router.get("/", protect, getAllBatches);
router.get("/:id", protect, getBatchById);

// Admin-only write routes
router.post(
  "/",
  protect,
  restrictTo("admin"),
  validateBody(createBatchSchema),
  createBatch
);

router.put(
  "/:id",
  protect,
  restrictTo("admin"),
  validateBody(updateBatchSchema),
  updateBatch
);

router.patch(
  "/:id/status",
  protect,
  restrictTo("admin"),
  validateBody(batchStatusSchema),
  updateBatchStatus
);

router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  archiveBatch
);

export default router;
