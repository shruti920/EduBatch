import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import AppError from "./utils/AppError.js";
import errorHandler from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import batchRoutes from "./routes/batches.js";
import enrollmentRoutes from "./routes/enrollments.js";
import attendanceRoutes from "./routes/attendance.js";
import dashboardRoutes from "./routes/dashboard.js";
import paymentRoutes from "./routes/payments.js";
import noticeRoutes from "./routes/notices.js";
import { handleWebhook } from "./controllers/paymentController.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

// Number of proxies in front of the API, so rate limiting sees the real client IP.
// Render alone = 1. Render behind the Vercel /api rewrite = 2.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 1));
app.disable("x-powered-by");

// HTTPS only in production (Render/Vercel terminate TLS and set x-forwarded-proto)
if (isProd) {
  app.use((req, res, next) => {
    if (req.secure || req.path === "/health") return next();
    return res.redirect(301, `https://${req.get("host")}${req.originalUrl}`);
  });
}

app.use(helmet());
app.use(
  cors({
    // Comma-separated list, e.g. "https://edubatch.vercel.app,http://localhost:5173"
    origin: (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((o) => o.trim()),
    // Needed for the httpOnly refresh-token cookie
    credentials: true,
  })
);

// Razorpay webhook needs the raw bytes to check its signature, so it is mounted
// before express.json() parses (and re-shapes) the body
app.post("/api/v1/payments/webhook", express.raw({ type: "application/json", limit: "100kb" }), handleWebhook);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, data: { ok: true }, message: "OK" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
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
