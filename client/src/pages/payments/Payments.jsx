import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ReceiptModal from "../../components/payments/ReceiptModal";
import PaymentStatusPill from "../../components/payments/PaymentStatusPill";
import { Button, EmptyState, Loading, Notice, PageHeader, Section, StatStrip, inputClass } from "../../components/ui";
import { getPaymentHistory, syncPayment } from "../../api/paymentApi";
import { getStudentDashboard } from "../../api/dashboardApi";
import { getBatches } from "../../api/batchApi";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../context/ToastContext";
import { usePayFee } from "../../hooks/usePayFee";
import { errorMessage, formatDate, formatINR } from "../../utils/format";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "failed", label: "Failed" },
  { key: "created", label: "Not completed" },
];

const PaymentAction = ({ payment: p, onReceipt, onSync, syncingId }) =>
  p.status === "paid" ? (
    <button type="button" onClick={() => onReceipt(p)} className="text-ink underline underline-offset-2">
      Receipt
    </button>
  ) : (
    <button
      type="button"
      onClick={() => onSync(p)}
      disabled={syncingId === p._id}
      className="text-ink underline underline-offset-2 disabled:opacity-60"
      title="Ask Razorpay whether this payment went through"
    >
      {syncingId === p._id ? "Checking…" : "Check status"}
    </button>
  );

const PaymentTable = ({ payments, showStudent, onReceipt, onSync, syncingId }) => (
  <>
    <ul className="divide-y divide-paper-border md:hidden">
      {payments.map((p) => (
        <li key={p._id} className="space-y-1.5 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-ink">{showStudent ? p.student?.name : p.batch?.name}</p>
              <p className="truncate text-xs text-ink-muted">
                {showStudent ? p.batch?.name : formatDate(p.paidAt || p.createdAt)}
              </p>
            </div>
            <p className="font-semibold tabular-nums text-ink">{formatINR(p.amount / 100)}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <PaymentStatusPill status={p.status} />
              {showStudent && formatDate(p.paidAt || p.createdAt)}
            </div>
            <PaymentAction payment={p} onReceipt={onReceipt} onSync={onSync} syncingId={syncingId} />
          </div>
          {p.status === "failed" && p.failureReason && <p className="text-xs text-ink-muted">{p.failureReason}</p>}
        </li>
      ))}
    </ul>
    <div className="relative hidden overflow-x-auto md:block">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-paper-border text-ink-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Date</th>
            {showStudent && <th className="px-4 py-2.5 font-medium">Student</th>}
            <th className="px-4 py-2.5 font-medium">Batch</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-border">
          {payments.map((p) => (
            <tr key={p._id} className="align-top">
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.paidAt || p.createdAt)}</td>
              {showStudent && (
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{p.student?.name}</p>
                  <p className="text-xs text-ink-muted">{p.student?.email}</p>
                </td>
              )}
              <td className="px-4 py-3">{p.batch?.name}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatINR(p.amount / 100)}</td>
              <td className="px-4 py-3">
                <PaymentStatusPill status={p.status} />
                {p.status === "failed" && p.failureReason && (
                  <p className="mt-1 max-w-56 text-xs text-ink-muted">{p.failureReason}</p>
                )}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <PaymentAction payment={p} onReceipt={onReceipt} onSync={onSync} syncingId={syncingId} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

const useSync = (reload) => {
  const toast = useToast();
  const [syncingId, setSyncingId] = useState(null);
  const sync = async (payment) => {
    setSyncingId(payment._id);
    try {
      const res = await syncPayment(payment._id);
      if (res.data.payment.status === "paid") toast.success(res.message);
      else toast.error(res.message);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSyncingId(null);
    }
  };
  return { sync, syncingId };
};


const StudentPayments = () => {
  const history = useApi(() => getPaymentHistory(), "my-payments");
  const dashboard = useApi(getStudentDashboard, "my-fees");
  const reloadAll = () => {
    history.reload();
    dashboard.reload();
  };
  const { pay, payingId, labelFor } = usePayFee({ onPaid: reloadAll });
  const { sync, syncingId } = useSync(reloadAll);
  const [receipt, setReceipt] = useState(null);

  const pending = (dashboard.data?.enrollments || []).filter((e) => e.paymentStatus === "pending" && e.batch);
  const payments = history.data?.payments || [];

  return (
    <>
      <PageHeader title="Payments" description="Pay batch fees online and download receipts." />

      {(history.error || dashboard.error) && <Notice>{history.error || dashboard.error}</Notice>}

      <Section title="Fees due">
        {dashboard.loading && !dashboard.data ? (
          <Loading />
        ) : pending.length === 0 ? (
          <EmptyState title="No fees due">You're all paid up.</EmptyState>
        ) : (
          <ul className="divide-y divide-paper-border">
            {pending.map((e) => (
              <li key={e._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{e.batch.name}</p>
                  <p className="text-sm text-ink-muted">{e.batch.subject}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold tabular-nums text-attention">{formatINR(e.batch.fee)}</span>
                  <Button onClick={() => pay(e)} disabled={payingId === e._id}>
                    {labelFor(e._id, "Pay now")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Payment history">
        {history.loading && !history.data ? (
          <Loading />
        ) : payments.length === 0 ? (
          <EmptyState title="No payments yet" />
        ) : (
          <PaymentTable payments={payments} onReceipt={setReceipt} onSync={sync} syncingId={syncingId} />
        )}
      </Section>

      <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
    </>
  );
};


const AdminPayments = () => {
  const [status, setStatus] = useState("all");
  const [batchId, setBatchId] = useState("all");
  const params = { status: status === "all" ? undefined : status, batch: batchId === "all" ? undefined : batchId };
  const history = useApi(() => getPaymentHistory(params), JSON.stringify(params));
  const batches = useApi(() => getBatches({ status: "all" }), "payment-batches");
  const { sync, syncingId } = useSync(history.reload);
  const [receipt, setReceipt] = useState(null);

  const payments = history.data?.payments || [];
  const summary = history.data?.summary;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Online fee payments made through Razorpay. Offline payments and waivers are recorded on Enrollments."
      />

      {history.error && <Notice>{history.error}</Notice>}

      {summary && (
        <StatStrip
          items={[
            { label: "Collected online", value: formatINR(summary.collected), tone: "success" },
            { label: "Successful payments", value: summary.paidCount },
            {
              label: "Failed attempts",
              value: summary.failedCount,
              tone: summary.failedCount ? "attention" : undefined,
            },
            { label: "Not completed", value: summary.openCount, note: "Opened but not paid" },
          ]}
        />
      )}

      <Section>
        <div className="flex flex-col gap-3 border-b border-paper-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Payment status" className="flex flex-wrap gap-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={status === t.key}
                onClick={() => setStatus(t.key)}
                className={`rounded px-3 py-1.5 text-sm ${
                  status === t.key ? "bg-ink text-white" : "text-ink-muted hover:bg-paper-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            aria-label="Filter by batch"
            className={`${inputClass} sm:w-64`}
          >
            <option value="all">All batches</option>
            {(batches.data?.batches || []).map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {history.loading && !history.data ? (
          <Loading />
        ) : payments.length === 0 ? (
          <EmptyState title="No payments match">Online payments appear here once students pay.</EmptyState>
        ) : (
          <div className={history.loading ? "opacity-60" : ""}>
            <PaymentTable payments={payments} showStudent onReceipt={setReceipt} onSync={sync} syncingId={syncingId} />
          </div>
        )}
      </Section>

      <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
    </>
  );
};

const Payments = () => {
  const { user } = useAuth();
  return <DashboardLayout>{user?.role === "admin" ? <AdminPayments /> : <StudentPayments />}</DashboardLayout>;
};

export default Payments;
