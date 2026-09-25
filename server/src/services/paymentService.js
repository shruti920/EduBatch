import crypto from "crypto";
import Payment from "../models/Payment.js";
import Enrollment from "../models/Enrollment.js";
import { sendInBackground, sendPaymentReceiptEmail } from "./emailService.js";

const hmacHex = (secret, message) => crypto.createHmac("sha256", secret).update(message).digest("hex");

// Constant-time comparison so the check can't be probed byte by byte
const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Checkout signature = HMAC_SHA256(order_id + "|" + razorpay_payment_id, key_secret).
 * order_id must be the one stored on our server, never the one the client sends back.
 */
export const isValidCheckoutSignature = (storedOrderId, razorpayPaymentId, signature) =>
  safeEqual(hmacHex(process.env.RAZORPAY_KEY_SECRET, `${storedOrderId}|${razorpayPaymentId}`), signature);

// Webhook signature = HMAC_SHA256(raw request body, webhook secret)
export const isValidWebhookSignature = (rawBody, signature) =>
  safeEqual(hmacHex(process.env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);

/**
 * Marks a payment and its enrollment as paid. Safe to call more than once and
 * from several places at the same time (checkout verify, webhook, manual sync):
 * only the first call changes anything.
 */
export const markPaymentPaid = async (payment, { razorpayPaymentId, signature = null, method = null, via }) => {
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: "paid" } },
    {
      status: "paid",
      razorpayPaymentId,
      razorpaySignature: signature,
      method,
      failureReason: null,
      paidAt: new Date(),
      verifiedVia: via,
    },
    { returnDocument: "after" }
  );

  const current = updated || (await Payment.findById(payment._id));

  // Money was received, so the enrollment is paid even if an admin changed it meanwhile
  await Enrollment.updateOne(
    { _id: current.enrollment },
    { paymentStatus: "paid", payment: current._id, amountPaid: current.amount / 100, paidAt: current.paidAt || new Date() }
  );

  // Receipt email only on the call that actually flipped the payment to paid,
  // so verify + webhook + sync racing each other never send it twice
  if (updated) {
    sendInBackground(async () => {
      const full = await Payment.findById(current._id)
        .populate("student", "name email")
        .populate("batch", "name");
      if (full?.student?.email) await sendPaymentReceiptEmail(full);
    });
  }

  return { payment: current, changed: Boolean(updated) };
};

// A failed attempt never overrides a payment that has already succeeded
export const markPaymentFailed = (payment, { razorpayPaymentId = null, reason = null } = {}) =>
  Payment.updateOne(
    { _id: payment._id, status: "created" },
    {
      status: "failed",
      ...(razorpayPaymentId && { razorpayPaymentId }),
      failureReason: reason ? String(reason).slice(0, 200) : "Payment was not completed",
    }
  );
