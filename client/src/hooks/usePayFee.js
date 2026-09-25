import { useState } from "react";
import { useToast } from "../context/ToastContext";
import { createPaymentOrder, reportPaymentFailure, verifyPayment } from "../api/paymentApi";
import { loadRazorpayCheckout } from "../utils/razorpay";
import { errorMessage, formatINR } from "../utils/format";


export const usePayFee = ({ onPaid } = {}) => {
  const toast = useToast();
  const [payingId, setPayingId] = useState(null);

  const pay = async (enrollment) => {
    setPayingId(enrollment._id);

    let order;
    let Razorpay;
    try {
      [order, Razorpay] = await Promise.all([createPaymentOrder(enrollment._id), loadRazorpayCheckout()]);
    } catch (err) {
      toast.error(errorMessage(err));
      setPayingId(null);
      return;
    }

    let settled = false;
    const finish = ({ tone, text }) => {
      settled = true;
      setPayingId(null);
      if (tone === "success") toast.success(text);
      else toast.error(text);
    };

    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "EduBatch",
      description: `Fee · ${order.batchName}`,
      prefill: order.prefill,
      notes: { enrollmentId: enrollment._id },
      theme: { color: "#1B2A4A" },
      retry: { enabled: true },
      modal: {
        // Off on purpose: Razorpay's close-confirmation can show as a native browser
        // dialog ("localhost says"). Closing is harmless — the order is reused next time.
        confirm_close: false,
        ondismiss: () => {
          if (settled) return;
          reportPaymentFailure({ razorpay_order_id: order.orderId, reason: "Closed without paying" }).catch(() => {});
          finish({ tone: "error", text: "Payment cancelled. You haven't been charged." });
        },
      },
      handler: async (response) => {
        settled = true;
        try {
          await verifyPayment(response);
          finish({ tone: "success", text: `Payment of ${formatINR(order.amount / 100)} received for ${order.batchName}.` });
          onPaid?.();
        } catch (err) {
          // The server message already covers rejected signatures; add the recovery
          // hint for everything else (e.g. the connection dropped after paying)
          const message = errorMessage(err);
          finish({
            tone: "error",
            text: message.includes("deducted")
              ? message
              : `${message} If money was deducted, open Payments and use "Check status".`,
          });
          onPaid?.();
        }
      },
    });

    // Fires for each failed attempt; Checkout stays open so the student can retry
    checkout.on("payment.failed", (resp) => {
      reportPaymentFailure({
        razorpay_order_id: order.orderId,
        razorpay_payment_id: resp.error?.metadata?.payment_id,
        reason: resp.error?.description,
      }).catch(() => {});
    });

    checkout.open();
  };

  return { pay, payingId };
};
