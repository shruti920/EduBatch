import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import AppError from "./utils/AppError.js";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import batchRoutes from "./routes/batches.js";
import enrollmentRoutes from "./routes/enrollments.js";
import attendanceRoutes from "./routes/attendance.js";
import dashboardRoutes from "./routes/dashboard.js";
import paymentRoutes from "./routes/payments.js";
import noticeRoutes from "./routes/notices.js";
import { handleWebhook } from "./controllers/paymentController.js";

const app = express();

// Render/Vercel sit behind a proxy; needed so rate limiting sees the real client IP
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    // Comma-separated list, e.g. "https://edubatch.vercel.app,http://localhost:5173"
    origin: (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((o) => o.trim()),
  })
);
// Razorpay webhook needs the raw bytes to check its signature, so it is mounted
// before express.json() parses (and re-shapes) the body
app.post("/api/v1/payments/webhook", express.raw({ type: "application/json", limit: "100kb" }), handleWebhook);

app.use(express.json({ limit: "10kb" }));

// 10 failed attempts per 15 minutes per IP on login/register (spec §10)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  // Only failed attempts count, so switching between accounts (e.g. a reviewer
  // trying all three demo logins) never locks anyone out; brute force still does.
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    message: "Too many failed attempts. Try again in 15 minutes.",
  },
});

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, data: { ok: true }, message: "OK" });
});

app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/register", authLimiter);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/batches", batchRoutes);
app.use("/api/v1/enrollments", enrollmentRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/notices", noticeRoutes);

app.all("{*path}", (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

app.use(errorHandler);

export default app;
