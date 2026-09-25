import { useRef, useState } from "react";
import { useToast } from "../context/ToastContext";
import { createPaymentOrder, reportPaymentFailure, verifyPayment } from "../api/paymentApi";
import { loadRazorpayCheckout } from "../utils/razorpay";
import { errorMessage, formatINR } from "../utils/format";

export const usePayFee = ({ onPaid } = {}) => {
  const toast = useToast();
  const [payingId, setPayingId] = useState(null);
  const [phase, setPhase] = useState(null);
  const busy = useRef(false);

  const pay = async (enrollment) => {
    if (busy.current) {
      toast.error("Finish or close the payment that's already open first.");
      return;
    }
    busy.current = true;
    setPayingId(enrollment._id);
    setPhase("opening");

    let order;
    let Razorpay;
    try {
      [order, Razorpay] = await Promise.all([createPaymentOrder(enrollment._id), loadRazorpayCheckout()]);
    } catch (err) {
      toast.error(errorMessage(err));
      busy.current = false;
      setPayingId(null);
      setPhase(null);
      return;
    }

    let settled = false;
    const finish = ({ tone, text }) => {
      settled = true;
      busy.current = false;
      setPayingId(null);
      setPhase(null);
      if (tone === "success") toast.success(text);
      else toast.error(text);
    };

    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "EduBatch",
      description: `${order.batchName} fee`,
      prefill: order.prefill,
      notes: { enrollmentId: enrollment._id },
      theme: { color: "#1F3494" },
      retry: { enabled: true },
      modal: {
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

    checkout.on("payment.failed", (resp) => {
      reportPaymentFailure({
        razorpay_order_id: order.orderId,
        razorpay_payment_id: resp.error?.metadata?.payment_id,
        reason: resp.error?.description,
      }).catch(() => {});
    });

    checkout.open();
    setPhase("open");
  };

  const labelFor = (id, idle) => (id !== payingId ? idle : phase === "opening" ? "Opening…" : "Paying…");

  return { pay, payingId, labelFor };
};
