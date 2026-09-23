import { Pill } from "../ui";

const STATUS = {
  paid: { tone: "success", label: "Paid" },
  created: { tone: "marigold", label: "Not completed" },
  failed: { tone: "attention", label: "Failed" },
};

const PaymentStatusPill = ({ status }) => {
  const s = STATUS[status] || STATUS.created;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export default PaymentStatusPill;
