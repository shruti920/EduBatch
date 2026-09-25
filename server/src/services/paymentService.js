import crypto from "crypto";
import Payment from "../models/Payment.js";
import Enrollment from "../models/Enrollment.js";
import { sendInBackground, sendPaymentReceiptEmail } from "./emailService.js";

const hmacHex = (secret, message) => crypto.createHmac("sha256", secret).update(message).digest("hex");

const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

export const isValidCheckoutSignature = (storedOrderId, razorpayPaymentId, signature) =>
  safeEqual(hmacHex(process.env.RAZORPAY_KEY_SECRET, `${storedOrderId}|${razorpayPaymentId}`), signature);

export const isValidWebhookSignature = (rawBody, signature) =>
  safeEqual(hmacHex(process.env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);

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

  await Enrollment.updateOne(
    { _id: current.enrollment },
    { paymentStatus: "paid", payment: current._id, amountPaid: current.amount / 100, paidAt: current.paidAt || new Date() }
  );

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

export const markPaymentFailed = (payment, { razorpayPaymentId = null, reason = null } = {}) =>
  Payment.updateOne(
    { _id: payment._id, status: "created" },
    {
      status: "failed",
      ...(razorpayPaymentId && { razorpayPaymentId }),
      failureReason: reason ? String(reason).slice(0, 200) : "Payment was not completed",
    }
  );
