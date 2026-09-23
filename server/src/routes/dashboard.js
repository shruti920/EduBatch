import express from "express";
import {
  getAdminDashboard,
  getTeacherDashboard,
  getStudentDashboard,
} from "../controllers/dashboardController.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.get("/admin", protect, restrictTo("admin"), getAdminDashboard);
router.get("/teacher", protect, restrictTo("teacher"), getTeacherDashboard);
router.get("/student", protect, restrictTo("student"), getStudentDashboard);

export default router;
