import express from "express";
import {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  updateBatchStatus,
  archiveBatch,
  getFacultyList,
} from "../controllers/batchController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  createBatchSchema,
  updateBatchSchema,
  batchStatusSchema,
} from "../validations/batchValidation.js";

const router = express.Router();

// Faculty lead metadata for Admin dropdowns
router.get("/meta/faculty", protect, restrictTo("admin"), getFacultyList);

// Core Batch routes
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
