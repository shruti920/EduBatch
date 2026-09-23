import mongoose from "mongoose";

/**
 * One document per Razorpay order. A student can retry a failed attempt on the
 * same order, so status can go created → failed → paid. "paid" is final.
 */
const paymentSchema = new mongoose.Schema(
  {
    enrollment: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    // Razorpay works in the smallest unit: paise for INR
    amount: { type: Number, required: true, min: [100, "Minimum amount is ₹1"] },
    currency: { type: String, default: "INR" },
    receipt: { type: String, required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null, index: true },
    razorpaySignature: { type: String, default: null },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
      index: true,
    },
    method: { type: String, default: null }, // upi, card, netbanking… (from Razorpay)
    failureReason: { type: String, default: null },
    paidAt: { type: Date, default: null },
    // How the payment was confirmed: checkout signature, webhook, or a manual status check
    verifiedVia: { type: String, enum: ["checkout", "webhook", "sync", null], default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ createdAt: -1 });

paymentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.razorpaySignature; // never needed by the client
  return obj;
};

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
