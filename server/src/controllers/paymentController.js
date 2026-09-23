import Payment from "../models/Payment.js";
import Enrollment from "../models/Enrollment.js";
import WebhookEvent from "../models/WebhookEvent.js";
import AppError from "../utils/AppError.js";
import { getRazorpay } from "../config/razorpay.js";
import {
  isValidCheckoutSignature,
  isValidWebhookSignature,
  markPaymentFailed,
  markPaymentPaid,
} from "../services/paymentService.js";

const populatePayment = (query) =>
  query
    .populate("student", "name email phone")
    .populate("batch", "name subject fee")
    .populate("enrollment", "paymentStatus isActive enrolledAt");

/**
 * POST /payments/create-order (student)
 * Creates (or reuses) a Razorpay order for one of the student's pending enrollments.
 * The amount always comes from the batch fee on the server, never from the client.
 */
export const createOrder = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findById(req.body.enrollmentId).populate("batch");

    if (!enrollment || enrollment.student.toString() !== req.user._id.toString()) {
      return next(new AppError("Enrollment not found.", 404));
    }
    if (!enrollment.isActive) {
      return next(new AppError("You are no longer enrolled in this batch.", 400));
    }
    if (enrollment.paymentStatus !== "pending") {
      return next(
        new AppError(
          enrollment.paymentStatus === "paid" ? "This fee is already paid." : "This fee has been waived.",
          409
        )
      );
    }

    const batch = enrollment.batch;
    if (!batch || batch.status === "archived") {
      return next(new AppError("This batch is archived. Contact the institute office.", 400));
    }

    const amount = Math.round(batch.fee * 100); // rupees → paise
    if (amount < 100) {
      return next(new AppError("This batch has no fee to pay online.", 400));
    }

    const razorpay = getRazorpay();

    // Reuse the open order for this enrollment if the fee hasn't changed. Razorpay
    // lets an order be paid only once, so this also prevents paying twice from two tabs.
    let payment = await Payment.findOne({
      enrollment: enrollment._id,
      amount,
      status: { $in: ["created", "failed"] },
    }).sort({ createdAt: -1 });

    if (!payment) {
      const receipt = `eb_${enrollment._id.toString().slice(-12)}_${Date.now().toString(36)}`;
      const order = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt,
        notes: {
          enrollmentId: enrollment._id.toString(),
          studentId: req.user._id.toString(),
          batch: batch.name.slice(0, 250),
        },
      });

      payment = await Payment.create({
        enrollment: enrollment._id,
        student: req.user._id,
        batch: batch._id,
        amount,
        currency: order.currency,
        receipt,
        razorpayOrderId: order.id,
      });
    } else if (payment.status === "failed") {
      payment.status = "created";
      payment.failureReason = null;
      await payment.save();
    }

    res.status(201).json({
      success: true,
      data: {
        paymentId: payment._id,
        orderId: payment.razorpayOrderId,
        amount: payment.amount,
        currency: payment.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        batchName: batch.name,
        prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone || "" },
      },
      message: "Order created.",
    });
  } catch (error) {
    // Razorpay SDK errors carry their details in error.error
    if (error?.error?.description) {
      return next(new AppError(`Razorpay: ${error.error.description}`, 502));
    }
    next(error);
  }
};

/**
 * POST /payments/verify (student)
 * The only client-driven way a payment becomes "paid": the signature is checked
 * against the order ID we stored, using the key secret that never leaves the server.
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, student: req.user._id });
    if (!payment) return next(new AppError("Payment not found.", 404));

    if (!isValidCheckoutSignature(payment.razorpayOrderId, razorpay_payment_id, razorpay_signature)) {
      console.warn(`Rejected payment signature for order ${payment.razorpayOrderId} (user ${req.user._id})`);
      return next(new AppError("Payment could not be verified. If money was deducted, contact the office.", 400));
    }

    const { payment: paid } = await markPaymentPaid(payment, {
      razorpayPaymentId: razorpay_payment_id,
      signature: razorpay_signature,
      via: "checkout",
    });

    const populated = await populatePayment(Payment.findById(paid._id));
    res.status(200).json({ success: true, data: { payment: populated }, message: "Payment successful." });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /payments/failure (student)
 * Records a failed or abandoned attempt for the history view. This never changes
 * money state: it can't touch a payment that is already paid.
 */
export const recordFailure = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, reason } = req.body;
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, student: req.user._id });
    if (!payment) return next(new AppError("Payment not found.", 404));

    await markPaymentFailed(payment, { razorpayPaymentId: razorpay_payment_id, reason });
    res.status(200).json({ success: true, data: null, message: "Attempt recorded." });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /payments/:id/sync (student owner or admin)
 * Asks Razorpay directly whether the order was paid. Covers the case where the
 * student paid but closed the tab before /verify ran and no webhook is configured.
 */
export const syncPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return next(new AppError("Payment not found.", 404));
    if (req.user.role === "student" && payment.student.toString() !== req.user._id.toString()) {
      return next(new AppError("Payment not found.", 404));
    }

    if (payment.status !== "paid") {
      const { items = [] } = await getRazorpay().orders.fetchPayments(payment.razorpayOrderId);
      const captured = items.find((p) => p.status === "captured" && p.amount === payment.amount);

      if (captured) {
        await markPaymentPaid(payment, { razorpayPaymentId: captured.id, method: captured.method, via: "sync" });
      } else if (items.length && items.every((p) => p.status === "failed")) {
        await markPaymentFailed(payment, {
          razorpayPaymentId: items[0].id,
          reason: items[0].error_description,
        });
      }
    }

    const populated = await populatePayment(Payment.findById(payment._id));
    res.status(200).json({
      success: true,
      data: { payment: populated },
      message: populated.status === "paid" ? "Payment confirmed." : "No completed payment found for this order yet.",
    });
  } catch (error) {
    if (error?.error?.description) return next(new AppError(`Razorpay: ${error.error.description}`, 502));
    next(error);
  }
};

/**
 * GET /payments/history
 * student → own payments; admin → all, filterable by status and batch.
 */
export const getPaymentHistory = async (req, res, next) => {
  try {
    const { status, batch } = req.query;
    const query = {};

    if (req.user.role === "student") query.student = req.user._id;
    if (status && status !== "all") query.status = status;
    if (batch && batch !== "all") query.batch = batch;

    const payments = await populatePayment(Payment.find(query)).sort({ createdAt: -1 }).limit(500);

    let summary = null;
    if (req.user.role === "admin") {
      const [paidAmounts, failedCount, openCount] = await Promise.all([
        Payment.find({ status: "paid" }).select("amount").lean(),
        Payment.countDocuments({ status: "failed" }),
        Payment.countDocuments({ status: "created" }),
      ]);
      summary = {
        paidCount: paidAmounts.length,
        // Returned in rupees for display (stored in paise)
        collected: paidAmounts.reduce((sum, p) => sum + p.amount, 0) / 100,
        failedCount,
        openCount,
      };
    }

    res.status(200).json({ success: true, data: { payments, summary }, message: "Payments retrieved." });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /payments/webhook (Razorpay → server, no JWT)
 * Backup path that confirms payments even if the student's browser closed.
 * Mounted with express.raw() because the signature is computed over the exact bytes.
 */
export const handleWebhook = async (req, res) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({ success: false, data: null, message: "Webhook secret not configured." });
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  const signature = req.get("x-razorpay-signature");

  if (!rawBody || !isValidWebhookSignature(rawBody, signature)) {
    return res.status(400).json({ success: false, data: null, message: "Invalid signature." });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ success: false, data: null, message: "Invalid JSON." });
  }

  const eventId = req.get("x-razorpay-event-id");

  // Duplicate delivery: already handled, acknowledge and stop
  if (eventId) {
    try {
      await WebhookEvent.create({ eventId, event: event.event });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(200).json({ success: true, data: null, message: "Duplicate event ignored." });
      }
      throw error;
    }
  }

  try {
    const entity = event.payload?.payment?.entity;
    const orderId = entity?.order_id || event.payload?.order?.entity?.id;
    const payment = orderId ? await Payment.findOne({ razorpayOrderId: orderId }) : null;

    // Events for orders this app didn't create are acknowledged and ignored
    if (payment && entity) {
      if (["payment.captured", "order.paid"].includes(event.event) && entity.status === "captured") {
        if (entity.amount === payment.amount) {
          await markPaymentPaid(payment, { razorpayPaymentId: entity.id, method: entity.method, via: "webhook" });
        } else {
          console.warn(`Webhook amount mismatch for order ${orderId}: ${entity.amount} vs ${payment.amount}`);
        }
      } else if (event.event === "payment.failed") {
        await markPaymentFailed(payment, { razorpayPaymentId: entity.id, reason: entity.error_description });
      }
    }

    res.status(200).json({ success: true, data: null, message: "Received." });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    // Forget the event so Razorpay's retry gets processed
    if (eventId) await WebhookEvent.deleteOne({ eventId }).catch(() => {});
    res.status(500).json({ success: false, data: null, message: "Processing failed." });
  }
};
