import { useState } from "react";
import { Button, Field, Modal, Notice, inputClass } from "../ui";
import { enrollStudent, getStudentOptions } from "../../api/enrollmentApi";
import { getBatches } from "../../api/batchApi";
import { useApi } from "../../hooks/useApi";
import { errorMessage, formatINR } from "../../utils/format";

const PAYMENT_OPTIONS = [
  { value: "pending", label: "Fee pending", hint: "Student pays online later" },
  { value: "paid", label: "Paid offline", hint: "Cash or bank transfer already received" },
  { value: "waived", label: "Fee waived", hint: "Scholarship or concession" },
];

const EnrollForm = ({ initialBatchId, onClose, onEnrolled }) => {
  const students = useApi(getStudentOptions, "student-options");
  const batches = useApi(() => getBatches({ status: "all" }), "enroll-batches");

  const [studentId, setStudentId] = useState("");
  const [batchId, setBatchId] = useState(initialBatchId || "");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const batchList = batches.data?.batches || [];
  const selectedBatch = batchList.find((b) => b._id === batchId);
  const loadError = students.error || batches.error;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId || !batchId) {
      setError("Choose a student and a batch.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const enrollment = await enrollStudent({ student: studentId, batch: batchId, paymentStatus });
      onEnrolled(`${enrollment.student?.name} enrolled in ${enrollment.batch?.name}.`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {(error || loadError) && <Notice>{error || loadError}</Notice>}

      <Field label="Student" htmlFor="enroll-student">
        <select
          id="enroll-student"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className={inputClass}
          disabled={students.loading}
        >
          <option value="">{students.loading ? "Loading students…" : "Choose a student"}</option>
          {(students.data || []).map((s) => (
            <option key={s._id} value={s._id}>
              {s.name} — {s.email}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Batch"
        htmlFor="enroll-batch"
        hint={
          selectedBatch
            ? `${selectedBatch.seatsRemaining} of ${selectedBatch.capacity} seats left · fee ${formatINR(selectedBatch.fee)}`
            : "Full batches can't be selected."
        }
      >
        <select
          id="enroll-batch"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          className={inputClass}
          disabled={batches.loading}
        >
          <option value="">{batches.loading ? "Loading batches…" : "Choose a batch"}</option>
          {batchList.map((b) => (
            <option key={b._id} value={b._id} disabled={b.isFull}>
              {b.name} ({b.isFull ? "full" : `${b.seatsRemaining} seats left`})
            </option>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-ink">Fee</legend>
        <div className="space-y-2">
          {PAYMENT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2 text-sm ${
                paymentStatus === opt.value ? "border-ink" : "border-paper-border"
              }`}
            >
              <input
                type="radio"
                name="paymentStatus"
                value={opt.value}
                checked={paymentStatus === opt.value}
                onChange={() => setPaymentStatus(opt.value)}
                className="mt-0.5 accent-ink"
              />
              <span>
                <span className="font-medium text-ink">{opt.label}</span>
                <span className="block text-xs text-ink-muted">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-paper-border pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !studentId || !batchId || selectedBatch?.isFull}>
          {saving ? "Enrolling…" : "Enroll student"}
        </Button>
      </div>
    </form>
  );
};

const EnrollStudentModal = ({ open, initialBatchId, onClose, onEnrolled }) => (
  <Modal open={open} title="Enroll a student" onClose={onClose}>
    {open && <EnrollForm initialBatchId={initialBatchId} onClose={onClose} onEnrolled={onEnrolled} />}
  </Modal>
);

export default EnrollStudentModal;
