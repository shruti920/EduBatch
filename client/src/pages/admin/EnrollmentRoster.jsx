import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Search, UserPlus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import EnrollStudentModal from "../../components/enrollments/EnrollStudentModal";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Loading,
  Notice,
  PageHeader,
  PaymentPill,
  Section,
  SeatsPill,
  StatStrip,
  inputClass,
} from "../../components/ui";
import { dropStudent, getAllEnrollments, getBatchRoster, updateEnrollmentStatus } from "../../api/enrollmentApi";
import { getBatches } from "../../api/batchApi";
import { useAuth } from "../../context/AuthContext";
import { useApi, useDebouncedValue } from "../../hooks/useApi";
import { useToast } from "../../context/ToastContext";
import { downloadCsv, errorMessage, formatDate, formatINR, todayLocal } from "../../utils/format";

const PAYMENT_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Fee pending" },
  { key: "paid", label: "Paid" },
  { key: "waived", label: "Waived" },
];

const FEE_ACTIONS = {
  paid: { label: "Mark as paid", text: "Record that this fee was paid offline (cash or bank transfer)." },
  waived: { label: "Waive fee", text: "The student won't be asked to pay for this batch." },
  pending: { label: "Mark as pending", text: "The fee will show as due again." },
};

/* Fee + drop controls, shared by the desktop table and the mobile cards */
const EnrollmentActions = ({ enrollment: e, onAction }) => (
  <div className="inline-flex flex-wrap items-center justify-end gap-3">
    {e.paymentStatus === "paid" && e.payment ? (
      <span className="text-sm text-ink-muted" title="Refunds are handled in the Razorpay dashboard">
        Paid online
      </span>
    ) : (
      <select
        value=""
        onChange={(ev) => ev.target.value && onAction({ type: "fee", enrollment: e, status: ev.target.value })}
        aria-label={`Change fee status for ${e.student?.name}`}
        className="w-40 rounded border border-paper-border bg-white px-2 py-1.5 text-sm"
      >
        <option value="">Change fee…</option>
        {Object.entries(FEE_ACTIONS)
          .filter(([status]) => status !== e.paymentStatus)
          .map(([status, meta]) => (
            <option key={status} value={status}>
              {meta.label}
            </option>
          ))}
      </select>
    )}
    <button
      type="button"
      onClick={() => onAction({ type: "drop", enrollment: e })}
      className="text-attention underline underline-offset-2"
    >
      Drop
    </button>
  </div>
);

/* ---------- Admin: every enrollment, with fee and drop actions ---------- */

const AdminEnrollments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [batchId, setBatchId] = useState(searchParams.get("batchId") || "all");
  const [payment, setPayment] = useState(searchParams.get("payment") || "all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());

  const [enrollOpen, setEnrollOpen] = useState(Boolean(searchParams.get("enroll")));
  const [action, setAction] = useState(null); // { type: "fee" | "drop", enrollment, status? }
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const params = {
    batch: batchId === "all" ? undefined : batchId,
    paymentStatus: payment === "all" ? undefined : payment,
    search: debouncedSearch || undefined,
  };
  const enrollments = useApi(() => getAllEnrollments(params), JSON.stringify(params));
  const batches = useApi(() => getBatches({ status: "all" }), "roster-batches");

  const rows = enrollments.data?.enrollments || [];
  const counts = enrollments.data?.counts;
  const batchList = batches.data?.batches || [];

  const changeBatch = (value) => {
    setBatchId(value);
    setSearchParams(value === "all" ? {} : { batchId: value }, { replace: true });
  };

  const closeEnroll = () => {
    setEnrollOpen(false);
    if (searchParams.get("enroll")) {
      const next = new URLSearchParams(searchParams);
      next.delete("enroll");
      setSearchParams(next, { replace: true });
    }
  };

  const runAction = async () => {
    const { type, enrollment, status } = action;
    setBusy(true);
    try {
      if (type === "drop") {
        await dropStudent(enrollment._id);
        toast.success(`${enrollment.student?.name} was dropped from ${enrollment.batch?.name}.`);
      } else {
        await updateEnrollmentStatus(enrollment._id, { paymentStatus: status });
        toast.success(`Fee status updated for ${enrollment.student?.name}.`);
      }
      enrollments.reload();
      batches.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      setAction(null);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `edubatch-enrollments-${todayLocal()}.csv`,
      ["Student", "Email", "Phone", "Batch", "Subject", "Fee (INR)", "Fee status", "Enrolled on"],
      rows.map((e) => [
        e.student?.name,
        e.student?.email,
        e.student?.phone,
        e.batch?.name,
        e.batch?.subject,
        e.batch?.fee,
        e.paymentStatus,
        e.enrolledAt?.slice(0, 10),
      ]),
    );

  return (
    <>
      <PageHeader
        title="Enrollments"
        description="Enroll students, record offline payments and waivers, and free up seats."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
              <Download size={16} aria-hidden="true" /> Export CSV
            </Button>
            <Button onClick={() => setEnrollOpen(true)}>
              <UserPlus size={16} aria-hidden="true" /> Enroll student
            </Button>
          </>
        }
      />

      {enrollments.error && <Notice>{enrollments.error}</Notice>}

      {counts && (
        <StatStrip
          items={[
            { label: "Active enrollments", value: counts.total },
            { label: "Paid", value: counts.paid, tone: "success" },
            { label: "Fee pending", value: counts.pending, tone: counts.pending ? "attention" : undefined },
            { label: "Waived", value: counts.waived },
          ]}
        />
      )}

      <Section>
        <div className="flex flex-col gap-3 border-b border-paper-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Fee status" className="flex flex-wrap gap-1">
            {PAYMENT_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={payment === t.key}
                onClick={() => setPayment(t.key)}
                className={`rounded px-3 py-1.5 text-sm ${
                  payment === t.key ? "bg-ink text-white" : "text-ink-muted hover:bg-paper-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={batchId}
              onChange={(e) => changeBatch(e.target.value)}
              aria-label="Filter by batch"
              className={`${inputClass} sm:w-56`}
            >
              <option value="all">All batches</option>
              {batchList.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search
                size={16}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student name or email"
                aria-label="Search students"
                className={`${inputClass} pl-9 sm:w-64`}
              />
            </div>
          </div>
        </div>

        {enrollments.loading && !enrollments.data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No enrollments match"
            action={<Button onClick={() => setEnrollOpen(true)}>Enroll a student</Button>}
          >
            Change the filters, or enroll a student into a batch.
          </EmptyState>
        ) : (
          <>
            {/* Phones: one card per enrollment instead of a sideways-scrolling table */}
            <ul className={`divide-y divide-paper-border md:hidden ${enrollments.loading ? "opacity-60" : ""}`}>
              {rows.map((e) => (
                <li key={e._id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{e.student?.name}</p>
                      <p className="truncate text-xs text-ink-muted">{e.student?.email}</p>
                    </div>
                    <PaymentPill status={e.paymentStatus} />
                  </div>
                  <p className="text-sm">
                    {e.batch?.name}
                    <span className="text-ink-muted">
                      {" "}
                      · {formatINR(e.batch?.fee)} · joined {formatDate(e.enrolledAt)}
                    </span>
                  </p>
                  <div className="flex justify-end">
                    <EnrollmentActions enrollment={e} onAction={setAction} />
                  </div>
                </li>
              ))}
            </ul>
            <div className={`relative hidden overflow-x-auto md:block ${enrollments.loading ? "opacity-60" : ""}`}>
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-paper-border text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-4 py-2.5 font-medium">Batch</th>
                    <th className="px-4 py-2.5 font-medium">Enrolled on</th>
                    <th className="px-4 py-2.5 font-medium">Fee</th>
                    <th className="px-4 py-2.5 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border">
                  {rows.map((e) => (
                    <tr key={e._id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{e.student?.name}</p>
                        <p className="text-xs text-ink-muted">
                          {e.student?.email}
                          {e.student?.phone && ` · ${e.student.phone}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{e.batch?.name}</p>
                        <p className="text-xs text-ink-muted">{formatINR(e.batch?.fee)}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(e.enrolledAt)}</td>
                      <td className="px-4 py-3">
                        <PaymentPill status={e.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <EnrollmentActions enrollment={e} onAction={setAction} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      <EnrollStudentModal
        open={enrollOpen}
        initialBatchId={batchId === "all" ? "" : batchId}
        onClose={closeEnroll}
        onEnrolled={(message) => {
          closeEnroll();
          toast.success(message);
          enrollments.reload();
          batches.reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(action)}
        title={action?.type === "drop" ? "Drop this student?" : FEE_ACTIONS[action?.status]?.label}
        confirmLabel={action?.type === "drop" ? "Drop student" : "Confirm"}
        tone={action?.type === "drop" ? "danger" : "primary"}
        busy={busy}
        onConfirm={runAction}
        onClose={() => setAction(null)}
      >
        <p>
          <strong>{action?.enrollment?.student?.name}</strong> · {action?.enrollment?.batch?.name}
        </p>
        <p className="mt-2 text-ink-muted">
          {action?.type === "drop"
            ? "Their seat is freed. Their enrollment and attendance history is kept, and you can enroll them again later."
            : FEE_ACTIONS[action?.status]?.text}
        </p>
      </ConfirmDialog>
    </>
  );
};

/* ---------- Teacher: read-only rosters for their own batches ---------- */

const TeacherRosters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const batches = useApi(() => getBatches(), "teacher-batches");
  const batchList = batches.data?.batches || [];
  const batchId = searchParams.get("batchId") || batchList[0]?._id || "";

  const roster = useApi(() => (batchId ? getBatchRoster(batchId) : Promise.resolve(null)), batchId);
  const students = roster.data?.roster || [];

  const exportCsv = () =>
    downloadCsv(
      `edubatch-roster-${roster.data?.batch?.name || "batch"}-${todayLocal()}.csv`,
      ["Student", "Email", "Phone", "Enrolled on"],
      students.map((e) => [e.student?.name, e.student?.email, e.student?.phone, e.enrolledAt?.slice(0, 10)]),
    );

  return (
    <>
      <PageHeader
        title="Rosters"
        description="Students enrolled in the batches you teach."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={!students.length}>
            <Download size={16} aria-hidden="true" /> Export CSV
          </Button>
        }
      />

      {(batches.error || roster.error) && <Notice>{batches.error || roster.error}</Notice>}

      {batches.loading && !batches.data ? (
        <Loading />
      ) : batchList.length === 0 ? (
        <Section>
          <EmptyState title="No batches assigned to you yet">
            An admin assigns teachers when creating a batch.
          </EmptyState>
        </Section>
      ) : (
        <Section
          title={
            <select
              value={batchId}
              onChange={(e) => setSearchParams({ batchId: e.target.value }, { replace: true })}
              aria-label="Choose batch"
              className={`${inputClass} font-semibold sm:w-72`}
            >
              {batchList.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          }
          aside={
            roster.data && <SeatsPill enrolled={roster.data.counts.enrolled} capacity={roster.data.counts.capacity} />
          }
        >
          {roster.loading && !roster.data ? (
            <Loading />
          ) : students.length === 0 ? (
            <EmptyState title="No students enrolled yet" />
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-paper-border text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-4 py-2.5 font-medium">Phone</th>
                    <th className="px-4 py-2.5 font-medium">Enrolled on</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border">
                  {students.map((e) => (
                    <tr key={e._id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{e.student?.name}</p>
                        <p className="text-xs text-ink-muted">{e.student?.email}</p>
                      </td>
                      <td className="px-4 py-3">{e.student?.phone || "—"}</td>
                      <td className="px-4 py-3">{formatDate(e.enrolledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}
    </>
  );
};

const EnrollmentRoster = () => {
  const { user } = useAuth();
  return <DashboardLayout>{user?.role === "admin" ? <AdminEnrollments /> : <TeacherRosters />}</DashboardLayout>;
};

export default EnrollmentRoster;
