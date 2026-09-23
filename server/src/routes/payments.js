import express from "express";
import rateLimit from "express-rate-limit";
import {
  createOrder,
  getPaymentHistory,
  recordFailure,
  syncPayment,
  verifyPayment,
} from "../controllers/paymentController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createOrderSchema, paymentFailureSchema, verifyPaymentSchema } from "../validations/paymentValidation.js";

const router = express.Router();

// Stops a script from creating Razorpay orders in a loop
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, data: null, message: "Too many payment attempts. Try again in a few minutes." },
});

router.post("/create-order", protect, restrictTo("student"), orderLimiter, validateBody(createOrderSchema), createOrder);
router.post("/verify", protect, restrictTo("student"), validateBody(verifyPaymentSchema), verifyPayment);
router.post("/failure", protect, restrictTo("student"), validateBody(paymentFailureSchema), recordFailure);
router.post("/:id/sync", protect, restrictTo("student", "admin"), orderLimiter, syncPayment);

// Teachers don't handle fees (spec §4), so history is students (own) and admins (all)
router.get("/history", protect, restrictTo("student", "admin"), getPaymentHistory);

export default router;
