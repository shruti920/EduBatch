import { useState } from "react";
import { Button, Field, Modal, Notice, inputClass } from "../ui";
import { createNotice, updateNotice } from "../../api/noticeApi";
import { errorMessage, todayLocal } from "../../utils/format";

const TITLE_MAX = 120;
const BODY_MAX = 2000;

const Counter = ({ value, max }) => (
  <span className={`text-xs tabular-nums ${value > max ? "text-attention" : "text-ink-muted"}`}>
    {value}/{max}
  </span>
);

/**
 * Post or edit a notice. `batches` are the audiences this user may post to;
 * `allowEveryone` is true only for admins. The audience can't change on edit.
 */
const NoticeFormBody = ({ notice, batches, allowEveryone, initialBatch, onClose, onSaved }) => {
  const isEdit = Boolean(notice);
  const [form, setForm] = useState(() => ({
    batch: isEdit ? notice.batch?._id || "" : initialBatch || (allowEveryone ? "" : batches[0]?._id || ""),
    title: notice?.title || "",
    body: notice?.body || "",
    pinned: notice?.pinned || false,
    expiresAt: notice?.expiresAt ? notice.expiresAt.slice(0, 10) : "",
  }));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const validate = () => {
    const e = {};
    if (!isEdit && !allowEveryone && !form.batch) e.batch = "Choose a batch.";
    if (form.title.trim().length < 3) e.title = "Use at least 3 characters.";
    if (form.title.trim().length > TITLE_MAX) e.title = `Keep it under ${TITLE_MAX} characters.`;
    if (!form.body.trim()) e.body = "Write a message.";
    if (form.body.trim().length > BODY_MAX) e.body = `Keep it under ${BODY_MAX} characters.`;
    if (form.expiresAt && form.expiresAt < todayLocal()) e.expiresAt = "Pick today or a later date.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      pinned: form.pinned,
      expiresAt: form.expiresAt || null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateNotice(notice._id, payload);
        onSaved("Notice updated.");
      } else {
        await createNotice({ ...payload, batch: form.batch || null });
        onSaved("Notice posted.");
      }
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setServerError(errorMessage(err));
      setSaving(false);
    }
  };

  const audienceLabel = isEdit ? notice.batch?.name || "Everyone" : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError && <Notice>{serverError}</Notice>}

      <Field
        label="Who should see this?"
        htmlFor="notice-batch"
        error={errors.batch}
        hint={isEdit ? "The audience can't be changed. Delete and post again to change it." : undefined}
      >
        {isEdit ? (
          <input id="notice-batch" value={audienceLabel} disabled className={inputClass} />
        ) : (
          <select
            id="notice-batch"
            value={form.batch}
            onChange={(e) => set("batch", e.target.value)}
            className={inputClass}
          >
            {allowEveryone ? (
              <option value="">Everyone (all students and teachers)</option>
            ) : (
              <option value="">Choose one of your batches</option>
            )}
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Title" htmlFor="notice-title" error={errors.title}>
        <input
          id="notice-title"
          value={form.title}
          maxLength={TITLE_MAX + 20}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Physics test moved to Saturday"
          className={`${inputClass} ${errors.title ? "border-attention" : ""}`}
        />
        <div className="mt-1 flex justify-end">
          <Counter value={form.title.trim().length} max={TITLE_MAX} />
        </div>
      </Field>

      <Field label="Message" htmlFor="notice-body" error={errors.body}>
        <textarea
          id="notice-body"
          rows={6}
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          className={`${inputClass} ${errors.body ? "border-attention" : ""}`}
        />
        <div className="mt-1 flex justify-end">
          <Counter value={form.body.trim().length} max={BODY_MAX} />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Show until (optional)"
          htmlFor="notice-expires"
          error={errors.expiresAt}
          hint="Students stop seeing it after this date."
        >
          <input
            id="notice-expires"
            type="date"
            min={todayLocal()}
            value={form.expiresAt}
            onChange={(e) => set("expiresAt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <label className="flex cursor-pointer items-start gap-3 self-center rounded border border-paper-border px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={form.pinned}
            onChange={(e) => set("pinned", e.target.checked)}
            className="mt-0.5 accent-ink"
          />
          <span>
            <span className="font-medium text-ink">Pin to top</span>
            <span className="block text-xs text-ink-muted">Stays above newer notices.</span>
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-paper-border pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Post notice"}
        </Button>
      </div>
    </form>
  );
};

const NoticeForm = ({ open, notice, ...props }) => (
  <Modal open={open} title={notice ? "Edit notice" : "Post a notice"} onClose={props.onClose} size="lg">
    {open && <NoticeFormBody key={notice?._id || "new"} notice={notice} {...props} />}
  </Modal>
);

export default NoticeForm;
