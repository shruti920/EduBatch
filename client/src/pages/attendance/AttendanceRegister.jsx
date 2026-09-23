import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Button,
  EmptyState,
  Field,
  Loading,
  Notice,
  PageHeader,
  Pill,
  Section,
  StatStrip,
  inputClass,
} from "../../components/ui";
import { getBatchAttendance, getBatchAttendanceByDate, getMyAttendance, markAttendance } from "../../api/attendanceApi";
import { getBatchRoster } from "../../api/enrollmentApi";
import { getBatches } from "../../api/batchApi";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../context/ToastContext";
import { errorMessage, formatDate, percent, todayLocal } from "../../utils/format";

const STATUSES = [
  { value: "present", label: "Present", tone: "success" },
  { value: "late", label: "Late", tone: "marigold" },
  { value: "absent", label: "Absent", tone: "attention" },
];
const STATUS_META = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

const StatusPill = ({ status }) => <Pill tone={STATUS_META[status]?.tone}>{STATUS_META[status]?.label || status}</Pill>;

const SEGMENT_ACTIVE = {
  present: "bg-forest text-white border-forest",
  late: "bg-marigold text-ink border-marigold",
  absent: "bg-attention text-white border-attention",
};

/* =================== Student: own attendance =================== */

const StudentAttendance = () => {
  const { data, error, loading } = useApi(getMyAttendance, "my-attendance");
  const overall = data?.overall;

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Late arrivals count as attended. Most institutes expect at least 75%."
      />
      {error && <Notice>{error}</Notice>}
      {loading && !data && <Loading />}

      {data && (
        <>
          <StatStrip
            items={[
              {
                label: "Overall",
                value: percent(overall.percentage),
                tone: overall.percentage !== null && overall.percentage < 75 ? "attention" : undefined,
              },
              { label: "Classes held", value: overall.totalSessions },
              { label: "Present", value: overall.present, note: `${overall.late} late` },
              { label: "Absent", value: overall.absent, tone: overall.absent ? "attention" : undefined },
            ]}
          />

          <Section title="By batch">
            {data.batches.length === 0 ? (
              <EmptyState title="You're not in a batch yet" />
            ) : (
              <ul className="divide-y divide-paper-border">
                {data.batches.map((b) => (
                  <li key={b.batch._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-ink">{b.batch.name}</p>
                      <p className="text-ink-muted">
                        {b.totalSessions
                          ? `${b.present + b.late} of ${b.totalSessions} classes attended`
                          : "No classes recorded yet"}
                      </p>
                    </div>
                    {b.percentage !== null && (
                      <Pill tone={b.percentage >= 75 ? "success" : "attention"}>
                        {percent(b.percentage)}
                        {b.percentage < 75 && " · below 75%"}
                      </Pill>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Class history">
            {data.history.length === 0 ? (
              <EmptyState title="No classes recorded yet" />
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-paper-border text-ink-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium">Batch</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Teacher's note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-border">
                    {data.history.map((h) => (
                      <tr key={`${h._id}`}>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(h.date)}</td>
                        <td className="px-4 py-3">{h.batch?.name}</td>
                        <td className="px-4 py-3">
                          <StatusPill status={h.status} />
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{h.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </>
  );
};

/* =================== Teacher / admin: mark a day =================== */

// Mounted fresh (via key) for each batch + date, so the form always starts from saved data
const MarkingForm = ({ batchId, date, onSaved }) => {
  const roster = useApi(() => getBatchRoster(batchId), `roster-${batchId}`);
  const existing = useApi(() => getBatchAttendanceByDate(batchId, date), `att-${batchId}-${date}`);

  const [edits, setEdits] = useState({}); // { [studentId]: { status?, remarks? } }
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  if ((roster.loading && !roster.data) || (existing.loading && !existing.data)) return <Loading />;
  if (roster.error || existing.error)
    return (
      <div className="p-4">
        <Notice>{roster.error || existing.error}</Notice>
      </div>
    );

  const students = roster.data.roster;
  const saved = existing.data.attendance;
  const savedById = Object.fromEntries(
    (saved?.records || []).map((r) => [r.student?._id || r.student, { status: r.status, remarks: r.remarks || "" }]),
  );

  // Unsaved days default everyone to present; the teacher only changes the exceptions
  const valueFor = (id) => ({
    status: "present",
    remarks: "",
    ...savedById[id],
    ...edits[id],
  });

  const setValue = (id, patch) => {
    setDirty(true);
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const markAll = (status) => {
    setDirty(true);
    setEdits(Object.fromEntries(students.map((e) => [e.student._id, { ...edits[e.student._id], status }])));
  };

  if (students.length === 0) {
    return <EmptyState title="No students in this batch">Enroll students before marking attendance.</EmptyState>;
  }

  const values = students.map((e) => valueFor(e.student._id));
  const tally = STATUSES.map((s) => ({ ...s, count: values.filter((v) => v.status === s.value).length }));
  const isDirty = !saved || dirty;

  const handleSave = async () => {
    setSaving(true);
    try {
      await markAttendance({
        batch: batchId,
        date,
        records: students.map((e) => ({ student: e.student._id, ...valueFor(e.student._id) })),
      });
      toast.success(`Attendance saved for ${formatDate(date)}.`);
      // Edits are kept (they now match what was saved) so the grid doesn't flicker while reloading
      setDirty(false);
      existing.reload();
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-paper-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          {saved
            ? `Saved by ${saved.markedBy?.name || "a teacher"}. Changes will update this day.`
            : "Not marked yet. Everyone starts as present."}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-muted">Mark all:</span>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => markAll(s.value)}
              className="rounded border border-paper-border px-2.5 py-1 hover:border-ink"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-paper-border text-ink-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-border">
            {students.map((e) => {
              const id = e.student._id;
              const value = valueFor(id);
              return (
                <tr key={id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{e.student.name}</p>
                    <p className="text-xs text-ink-muted">{e.student.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div role="radiogroup" aria-label={`Status for ${e.student.name}`} className="inline-flex">
                      {STATUSES.map((s, i) => (
                        <button
                          key={s.value}
                          type="button"
                          role="radio"
                          aria-checked={value.status === s.value}
                          onClick={() => setValue(id, { status: s.value })}
                          className={`border px-3 py-1.5 text-sm ${i === 0 ? "rounded-l" : ""} ${
                            i === STATUSES.length - 1 ? "rounded-r" : "-mr-px"
                          } ${
                            value.status === s.value
                              ? SEGMENT_ACTIVE[s.value]
                              : "border-paper-border bg-white text-ink-muted hover:text-ink"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={value.remarks}
                      maxLength={200}
                      onChange={(ev) => setValue(id, { remarks: ev.target.value })}
                      placeholder="Optional"
                      aria-label={`Note for ${e.student.name}`}
                      className={`${inputClass} py-1.5`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-paper-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">{tally.map((t) => `${t.count} ${t.label.toLowerCase()}`).join(", ")}</p>
        <Button onClick={handleSave} disabled={saving || !isDirty}>
          {saving ? "Saving…" : saved ? "Save changes" : "Save attendance"}
        </Button>
      </div>
    </>
  );
};

const History = ({ batchId, reloadKey, onOpen }) => {
  const { data, error, loading } = useApi(() => getBatchAttendance(batchId), `history-${batchId}-${reloadKey}`);
  if (loading && !data) return <Loading />;
  if (error)
    return (
      <div className="p-4">
        <Notice>{error}</Notice>
      </div>
    );
  if (!data.sessions.length) return <EmptyState title="No attendance recorded for this batch yet" />;

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-paper-border text-ink-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 text-right font-medium">Present</th>
            <th className="px-4 py-2.5 text-right font-medium">Late</th>
            <th className="px-4 py-2.5 text-right font-medium">Absent</th>
            <th className="px-4 py-2.5 font-medium">Attended</th>
            <th className="px-4 py-2.5 font-medium">Marked by</th>
            <th className="px-4 py-2.5 font-medium">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-border tabular-nums">
          {data.sessions.map((s) => (
            <tr key={s._id}>
              <td className="px-4 py-3 whitespace-nowrap">{formatDate(s.date)}</td>
              <td className="px-4 py-3 text-right">{s.summary.present}</td>
              <td className="px-4 py-3 text-right">{s.summary.late}</td>
              <td className="px-4 py-3 text-right">{s.summary.absent}</td>
              <td className="px-4 py-3">
                <Pill tone={s.summary.rate >= 75 ? "success" : "attention"}>{percent(s.summary.rate)}</Pill>
              </td>
              <td className="px-4 py-3">{s.markedBy?.name || "—"}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onOpen(s.date.slice(0, 10))}
                  className="text-ink underline underline-offset-2"
                >
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const StaffAttendance = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const batches = useApi(() => getBatches({ status: "active" }), "attendance-batches");
  // Teachers' batch list isn't filtered by status on the server, so filter here too
  const batchList = (batches.data?.batches || []).filter((b) => b.status === "active");

  const batchId = searchParams.get("batchId") || batchList[0]?._id || "";
  const [date, setDate] = useState(todayLocal());
  const [tab, setTab] = useState("mark");
  const [savedCount, setSavedCount] = useState(0);

  const selectBatch = (id) => setSearchParams({ batchId: id }, { replace: true });

  // Dates are limited to the batch's run, and never later than today
  const selected = batchList.find((b) => b._id === batchId);
  const today = todayLocal();
  const minDate = selected?.startDate?.slice(0, 10);
  const maxDate = selected?.endDate && selected.endDate.slice(0, 10) < today ? selected.endDate.slice(0, 10) : today;
  const dateOutOfRange = (minDate && date < minDate) || date > maxDate;

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Mark a whole class in one go. Saving the same date again updates it."
      />
      {batches.error && <Notice>{batches.error}</Notice>}

      {batches.loading && !batches.data ? (
        <Loading />
      ) : batchList.length === 0 ? (
        <Section>
          <EmptyState title="No active batches">
            Attendance can only be marked for active batches. An admin can mark an upcoming batch as active from
            Batches.
          </EmptyState>
        </Section>
      ) : (
        <Section>
          <div className="grid gap-3 border-b border-paper-border p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <Field label="Batch" htmlFor="att-batch">
              <select
                id="att-batch"
                value={batchId}
                onChange={(e) => selectBatch(e.target.value)}
                className={inputClass}
              >
                {batchList.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date" htmlFor="att-date">
              <input
                id="att-date"
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className={inputClass}
                disabled={tab !== "mark"}
              />
            </Field>
            <div role="tablist" aria-label="View" className="flex gap-1">
              {[
                { key: "mark", label: "Mark" },
                { key: "history", label: "History" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded px-3 py-2 text-sm ${
                    tab === t.key ? "bg-ink text-white" : "text-ink-muted hover:bg-paper-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "mark" && dateOutOfRange ? (
            <div className="p-4">
              <Notice>
                Pick a date between {minDate ? formatDate(minDate) : "the batch start"} and {formatDate(maxDate)}.
              </Notice>
            </div>
          ) : tab === "mark" ? (
            <MarkingForm
              key={`${batchId}-${date}`}
              batchId={batchId}
              date={date}
              onSaved={() => setSavedCount((n) => n + 1)}
            />
          ) : (
            <History
              batchId={batchId}
              reloadKey={savedCount}
              onOpen={(d) => {
                setDate(d);
                setTab("mark");
              }}
            />
          )}
        </Section>
      )}
    </>
  );
};

const AttendanceRegister = () => {
  const { user } = useAuth();
  return <DashboardLayout>{user?.role === "student" ? <StudentAttendance /> : <StaffAttendance />}</DashboardLayout>;
};

export default AttendanceRegister;
