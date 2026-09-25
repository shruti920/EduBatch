import { createPortal } from "react-dom";
import { Button, Modal } from "../ui";
import { Logo } from "../brand/Logo";
import { formatDate, formatINR } from "../../utils/format";

const METHOD_LABEL = { upi: "UPI", card: "Card", netbanking: "Net banking", wallet: "Wallet", emi: "EMI" };

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 border-b border-paper-border py-2 text-sm last:border-0">
    <dt className="text-ink-muted">{label}</dt>
    <dd className="text-right font-medium break-all text-ink">{children}</dd>
  </div>
);

const ReceiptBody = ({ payment }) => (
  <div>
    <div className="flex items-center justify-between border-b border-margin pb-3">
      <Logo size={26} textClassName="text-xl" />
      <p className="text-sm text-ink-muted">Receipt {payment.receipt}</p>
    </div>
    <div className="relative">
      <p className="mt-4 text-3xl font-semibold tabular-nums text-ink">{formatINR(payment.amount / 100)}</p>
      <span className="stamp absolute top-1 right-2 text-lg text-forest">PAID</span>
    </div>
    <p className="text-sm text-ink-muted">Paid on {formatDate(payment.paidAt)}</p>
    <dl className="mt-4">
      <Row label="Student">{payment.student?.name}</Row>
      <Row label="Email">{payment.student?.email}</Row>
      <Row label="Batch">{payment.batch?.name}</Row>
      <Row label="Paid by">{METHOD_LABEL[payment.method] || "Online (Razorpay)"}</Row>
      <Row label="Payment ID">{payment.razorpayPaymentId}</Row>
      <Row label="Order ID">{payment.razorpayOrderId}</Row>
    </dl>
    <p className="mt-4 text-xs text-ink-muted">Processed by Razorpay. Keep this receipt for your records.</p>
  </div>
);

const ReceiptModal = ({ payment, onClose }) => (
  <>
    <Modal
      open={Boolean(payment)}
      title="Fee receipt"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>Print or save as PDF</Button>
        </>
      }
    >
      {payment && <ReceiptBody payment={payment} />}
    </Modal>
    {payment &&
      createPortal(
        <div className="print-only">
          <ReceiptBody payment={payment} />
        </div>,
        document.body
      )}
  </>
);

export default ReceiptModal;
