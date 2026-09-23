import { useState } from "react";
import { Button, Field, Modal, Notice, inputClass } from "../ui";
import { createBatch, updateBatch } from "../../api/batchApi";
import { errorMessage } from "../../utils/format";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toForm = (batch) => ({
  name: batch?.name || "",
  subject: batch?.subject || "",
  description: batch?.description || "",
  teacher: batch?.teacher?._id || batch?.teacher || "",
  capacity: batch?.capacity ?? "",
  fee: batch?.fee ?? "",
  status: batch?.status === "active" ? "active" : "upcoming",
  startDate: batch?.startDate ? batch.startDate.slice(0, 10) : "",
  endDate: batch?.endDate ? batch.endDate.slice(0, 10) : "",
  days: batch?.schedule?.days || [],
  startTime: batch?.schedule?.startTime || "",
  endTime: batch?.schedule?.endTime || "",
  venue: batch?.schedule?.venue || "",
});

const validate = (f) => {
  const e = {};
  if (f.name.trim().length < 3) e.name = "Use at least 3 characters.";
  if (f.subject.trim().length < 2) e.subject = "Enter a subject.";
  if (!f.teacher) e.teacher = "Choose a teacher.";
  if (!Number.isInteger(Number(f.capacity)) || Number(f.capacity) < 1 || Number(f.capacity) > 500 || f.capacity === "")
    e.capacity = "Whole number from 1 to 500.";
  if (f.fee === "" || Number(f.fee) < 0) e.fee = "Enter the fee in rupees (0 or more).";
  if (!f.days.length) e.days = "Pick at least one class day.";
  if (!f.startTime) e.startTime = "Required.";
  if (!f.endTime) e.endTime = "Required.";
  if (f.startTime && f.endTime && f.endTime <= f.startTime) e.endTime = "Must be after the start time.";
  if (f.startDate && f.endDate && f.endDate < f.startDate) e.endDate = "Can't be before the start date.";
  return e;
};

// Server returns field errors keyed like "schedule.endTime"; map them onto form fields
const fromServerErrors = (errors) =>
  Object.fromEntries(Object.entries(errors || {}).map(([k, v]) => [k.replace("schedule.", ""), v]));

// Mounted fresh for each open (see wrapper below), so the initial state is always the right batch
const BatchForm = ({ batch, teachers, onClose, onSaved }) => {
  const isEdit = Boolean(batch);
  const [form, setForm] = useState(() => toForm(batch));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const onInput = (e) => set(e.target.name, e.target.value);
  const toggleDay = (day) =>
    set("days", form.days.includes(day) ? form.days.filter((d) => d !== day) : DAYS.filter((d) => d === day || form.days.includes(d)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      description: form.description.trim(),
      teacher: form.teacher,
      capacity: Number(form.capacity),
      fee: Number(form.fee),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      schedule: {
        days: form.days,
        startTime: form.startTime,
        endTime: form.endTime,
        venue: form.venue.trim(),
      },
    };
    // Status of an archived batch is changed with Restore, not from this form
    if (!isEdit || batch.status !== "archived") payload.status = form.status;

    setSaving(true);
    try {
      if (isEdit) await updateBatch(batch._id, payload);
      else await createBatch(payload);
      onSaved(isEdit ? "Batch updated." : `${payload.name} created.`);
    } catch (err) {
      setErrors(fromServerErrors(err.response?.data?.errors));
      setServerError(errorMessage(err));
      setSaving(false);
    }
  };

  const input = (name, props = {}) => (
    <input
      id={`batch-${name}`}
      name={name}
      value={form[name]}
      onChange={onInput}
      aria-invalid={Boolean(errors[name])}
      className={`${inputClass} ${errors[name] ? "border-attention" : ""}`}
      {...props}
    />
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError && <Notice>{serverError}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Batch name" htmlFor="batch-name" error={errors.name}>
          {input("name", { placeholder: "JEE 2027 Morning" })}
        </Field>
        <Field label="Subject" htmlFor="batch-subject" error={errors.subject}>
          {input("subject", { placeholder: "Physics" })}
        </Field>
      </div>

      <Field label="Description (optional)" htmlFor="batch-description">
        <textarea
          id="batch-description"
          name="description"
          rows={2}
          value={form.description}
          onChange={onInput}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Teacher" htmlFor="batch-teacher" error={errors.teacher}>
          <select
            id="batch-teacher"
            name="teacher"
            value={form.teacher}
            onChange={onInput}
            className={`${inputClass} ${errors.teacher ? "border-attention" : ""}`}
          >
            <option value="">Choose a teacher</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Capacity" htmlFor="batch-capacity" error={errors.capacity} hint={isEdit ? `${batch.enrolledCount ?? 0} enrolled now` : undefined}>
          {input("capacity", { type: "number", min: 1, max: 500, inputMode: "numeric" })}
        </Field>
        <Field label="Fee (₹)" htmlFor="batch-fee" error={errors.fee}>
          {input("fee", { type: "number", min: 0, inputMode: "numeric" })}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" htmlFor="batch-startDate" error={errors.startDate}>
          {input("startDate", { type: "date" })}
        </Field>
        <Field label="End date" htmlFor="batch-endDate" error={errors.endDate}>
          {input("endDate", { type: "date", min: form.startDate || undefined })}
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-ink">Class days</legend>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((day) => {
            const selected = form.days.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleDay(day)}
                className={`w-12 rounded border py-1.5 text-sm ${
                  selected ? "border-ink bg-ink text-white" : "border-paper-border text-ink-muted hover:border-ink"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
        {errors.days && <p className="mt-1 text-xs text-attention">{errors.days}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Starts at" htmlFor="batch-startTime" error={errors.startTime}>
          {input("startTime", { type: "time" })}
        </Field>
        <Field label="Ends at" htmlFor="batch-endTime" error={errors.endTime}>
          {input("endTime", { type: "time" })}
        </Field>
        <Field label="Room (optional)" htmlFor="batch-venue" error={errors.venue}>
          {input("venue", { placeholder: "Room 2" })}
        </Field>
      </div>

      {(!isEdit || batch.status !== "archived") && (
        <Field label="Status" htmlFor="batch-status">
          <select id="batch-status" name="status" value={form.status} onChange={onInput} className={inputClass}>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
          </select>
        </Field>
      )}

      <div className="flex justify-end gap-2 border-t border-paper-border pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create batch"}
        </Button>
      </div>
    </form>
  );
};

const BatchModal = ({ open, batch, teachers, onClose, onSaved }) => (
  <Modal open={open} title={batch ? "Edit batch" : "New batch"} onClose={onClose} size="lg">
    {open && <BatchForm key={batch?._id || "new"} batch={batch} teachers={teachers} onClose={onClose} onSaved={onSaved} />}
  </Modal>
);

export default BatchModal;
