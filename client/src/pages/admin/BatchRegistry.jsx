import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Plus, Search } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import BatchModal from "../../components/batches/BatchModal";
import {
  BatchStatusPill,
  Button,
  ConfirmDialog,
  EmptyState,
  Loading,
  Notice,
  PageHeader,
  Section,
  SeatsPill,
  inputClass,
} from "../../components/ui";
import { archiveBatch, getBatches, getTeacherOptions, updateBatchStatus } from "../../api/batchApi";
import { useApi, useDebouncedValue } from "../../hooks/useApi";
import { useToast } from "../../context/ToastContext";
import { downloadCsv, errorMessage, formatDate, formatINR, formatSchedule, todayLocal } from "../../utils/format";

const TABS = [
  { key: "all", label: "Current" },
  { key: "active", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "archived", label: "Archived" },
];

const BatchRegistry = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const debouncedSearch = useDebouncedValue(search.trim());


  const [modal, setModal] = useState(() => (searchParams.get("new") ? { batch: null } : null));
  const [confirm, setConfirm] = useState(null); // { batch, nextStatus }
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const params = { status: tab, search: debouncedSearch || undefined, subject: subject === "all" ? undefined : subject };
  const batchesQuery = useApi(() => getBatches(params), JSON.stringify(params));
  const teachersQuery = useApi(getTeacherOptions, "teachers");

  const batches = batchesQuery.data?.batches || [];
  const counts = batchesQuery.data?.counts;
  const subjects = counts?.subjects || [];

  const closeModal = () => {
    setModal(null);
    if (searchParams.get("new")) setSearchParams({}, { replace: true });
  };

  const handleSaved = (message) => {
    closeModal();
    toast.success(message);
    batchesQuery.reload();
  };

  const applyStatus = async () => {
    const { batch, nextStatus } = confirm;
    setBusy(true);
    try {
      if (nextStatus === "archived") await archiveBatch(batch._id);
      else await updateBatchStatus(batch._id, nextStatus);
      toast.success(`${batch.name} is now ${nextStatus}.`);
      batchesQuery.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `edubatch-batches-${todayLocal()}.csv`,
      ["Batch", "Subject", "Status", "Teacher", "Schedule", "Start", "End", "Enrolled", "Capacity", "Fee (INR)"],
      batches.map((b) => [
        b.name,
        b.subject,
        b.status,
        b.teacher?.name || "",
        formatSchedule(b.schedule),
        b.startDate ? b.startDate.slice(0, 10) : "",
        b.endDate ? b.endDate.slice(0, 10) : "",
        b.enrolledCount,
        b.capacity,
        b.fee,
      ])
    );

  const noTeachers = teachersQuery.data && teachersQuery.data.length === 0;

  return (
    <DashboardLayout>
      <PageHeader
        title="Batches"
        description="Create batches, assign teachers, and set capacity and fees."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={!batches.length}>
              <Download size={16} aria-hidden="true" /> Export CSV
            </Button>
            <Button onClick={() => setModal({ batch: null })} disabled={noTeachers}>
              <Plus size={16} aria-hidden="true" /> New batch
            </Button>
          </>
        }
      />

      {noTeachers && (
        <Notice>No active teacher accounts exist yet. Run the seed script or add a teacher before creating a batch.</Notice>
      )}
      {batchesQuery.error && <Notice>{batchesQuery.error}</Notice>}

      <Section>
        <div className="flex flex-col gap-3 border-b border-paper-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Batch status" className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`rounded px-3 py-1.5 text-sm ${
                  tab === t.key ? "bg-ink text-white" : "text-ink-muted hover:bg-paper-muted hover:text-ink"
                }`}
              >
                {t.label}
                {counts && <span className="ml-1.5 tabular-nums opacity-75">{counts[t.key]}</span>}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or subject"
                aria-label="Search batches"
                className={`${inputClass} pl-9 sm:w-64`}
              />
            </div>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label="Filter by subject"
              className={`${inputClass} sm:w-48`}
            >
              <option value="all">All subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {batchesQuery.loading && !batchesQuery.data ? (
          <Loading />
        ) : batches.length === 0 ? (
          <EmptyState title={search || subject !== "all" ? "No batches match these filters" : "No batches here yet"}>
            {tab === "archived" ? "Archived batches will appear here." : "Create a batch to start enrolling students."}
          </EmptyState>
        ) : (
          <div className={`relative overflow-x-auto ${batchesQuery.loading ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-paper-border text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Batch</th>
                  <th className="px-4 py-2.5 font-medium">Teacher</th>
                  <th className="px-4 py-2.5 font-medium">Schedule</th>
                  <th className="px-4 py-2.5 font-medium">Seats</th>
                  <th className="px-4 py-2.5 text-right font-medium">Fee</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-border">
                {batches.map((b) => (
                  <tr key={b._id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{b.name}</p>
                      <p className="text-xs text-ink-muted">
                        {b.subject}
                        {b.startDate && ` · ${formatDate(b.startDate)} – ${formatDate(b.endDate)}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">{b.teacher?.name || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {formatSchedule(b.schedule)}
                      {b.schedule?.venue && <span className="block text-xs">{b.schedule.venue}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <SeatsPill enrolled={b.enrolledCount} capacity={b.capacity} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatINR(b.fee)}</td>
                    <td className="px-4 py-3">
                      <BatchStatusPill status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {b.status === "archived" ? (
                        <button
                          type="button"
                          onClick={() => setConfirm({ batch: b, nextStatus: "active" })}
                          className="text-ink underline underline-offset-2"
                        >
                          Restore
                        </button>
                      ) : (
                        <>
                          <Link to={`/enrollments?batchId=${b._id}`} className="text-ink underline underline-offset-2">
                            Roster
                          </Link>
                          <button
                            type="button"
                            onClick={() => setModal({ batch: b })}
                            className="ml-3 text-ink underline underline-offset-2"
                          >
                            Edit
                          </button>
                          {b.status === "upcoming" && (
                            <button
                              type="button"
                              onClick={() => setConfirm({ batch: b, nextStatus: "active" })}
                              className="ml-3 text-ink underline underline-offset-2"
                            >
                              Start
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setConfirm({ batch: b, nextStatus: "archived" })}
                            className="ml-3 text-attention underline underline-offset-2"
                          >
                            Archive
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <BatchModal
        open={Boolean(modal)}
        batch={modal?.batch}
        teachers={teachersQuery.data || []}
        onClose={closeModal}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.nextStatus === "archived"
            ? "Archive this batch?"
            : confirm?.batch?.status === "archived"
              ? "Restore this batch?"
              : "Mark batch as active?"
        }
        confirmLabel={confirm?.nextStatus === "archived" ? "Archive batch" : confirm?.batch?.status === "archived" ? "Restore batch" : "Mark active"}
        tone={confirm?.nextStatus === "archived" ? "danger" : "primary"}
        busy={busy}
        onConfirm={applyStatus}
        onClose={() => setConfirm(null)}
      >
        {confirm?.nextStatus === "archived" ? (
          <p>
            <strong>{confirm?.batch?.name}</strong> will stop accepting enrollments and attendance. Its enrollment and
            attendance history is kept, and you can restore it later.
          </p>
        ) : (
          <p>
            <strong>{confirm?.batch?.name}</strong> will be marked active and appear on dashboards.
          </p>
        )}
      </ConfirmDialog>
    </DashboardLayout>
  );
};

export default BatchRegistry;
