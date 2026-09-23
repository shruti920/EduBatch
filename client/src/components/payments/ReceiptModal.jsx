import { Button, Modal } from "../ui";
import { formatDate, formatINR } from "../../utils/format";

const METHOD_LABEL = { upi: "UPI", card: "Card", netbanking: "Net banking", wallet: "Wallet", emi: "EMI" };

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 border-b border-paper-border py-2 text-sm last:border-0">
    <dt className="text-ink-muted">{label}</dt>
    <dd className="text-right font-medium text-ink">{children}</dd>
  </div>
);

// Print-friendly fee receipt. Only shown for paid payments.
const ReceiptModal = ({ payment, onClose }) => (
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
    {payment && (
      <div className="print-area">
        <div className="flex items-baseline justify-between border-b-2 border-ink pb-3">
          <p className="font-serif text-2xl font-semibold text-ink">EduBatch</p>
          <p className="text-sm text-ink-muted">Receipt {payment.receipt}</p>
        </div>
        <p className="mt-4 text-3xl font-semibold tabular-nums text-forest">{formatINR(payment.amount / 100)}</p>
        <p className="text-sm text-ink-muted">Paid on {formatDate(payment.paidAt)}</p>
        <dl className="mt-4">
          <Row label="Student">{payment.student?.name}</Row>
          <Row label="Email">{payment.student?.email}</Row>
          <Row label="Batch">{payment.batch?.name}</Row>
          <Row label="Paid by">{METHOD_LABEL[payment.method] || "Online (Razorpay)"}</Row>
          <Row label="Payment ID">{payment.razorpayPaymentId}</Row>
          <Row label="Order ID">{payment.razorpayOrderId}</Row>
        </dl>
        <p className="mt-4 text-xs text-ink-muted">
          Processed by Razorpay. Keep this receipt for your records.
        </p>
      </div>
    )}
  </Modal>
);

export default ReceiptModal;
