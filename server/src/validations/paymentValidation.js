import { z } from "zod";
import { objectId } from "./common.js";

const orderId = z.string({ error: "Order ID is required" }).regex(/^order_[A-Za-z0-9]+$/, "Invalid order ID");
const paymentId = z.string({ error: "Payment ID is required" }).regex(/^pay_[A-Za-z0-9]+$/, "Invalid payment ID");

export const createOrderSchema = z.object({
  enrollmentId: objectId("Enrollment"),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: orderId,
  razorpay_payment_id: paymentId,
  razorpay_signature: z.string({ error: "Signature is required" }).regex(/^[a-f0-9]{64}$/, "Invalid signature"),
});

export const paymentFailureSchema = z.object({
  razorpay_order_id: orderId,
  razorpay_payment_id: paymentId.optional(),
  reason: z.string().max(500).optional(),
});
