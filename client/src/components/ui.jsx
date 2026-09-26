import { useEffect, useId, useRef, useState } from "react";
import { useDocumentTitle } from "../hooks/useUi";
import { X, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

/* ---------- Layout ---------- */

export const PageHeader = ({ title, documentTitle, description, actions }) => {
  useDocumentTitle(documentTitle || (typeof title === "string" ? title : ""));
  return (
    <div className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-[2rem] leading-tight font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
};

export const Section = ({ title, aside, children, className = "" }) => (
  <section
    className={`min-w-0 rounded-[var(--radius-sheet)] border border-paper-border bg-white shadow-[var(--shadow-sheet)] ${className}`}
  >
    {(title || aside) && (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-border px-4 py-3">
        {typeof title === "string" ? <h2 className="text-base font-semibold text-ink">{title}</h2> : title}
        {aside}
      </div>
    )}
    {children}
  </section>
);

/**
 * Figures as index cards: a label, the red header rule every index card has,
 * then the number. items: [{ label, value, note, tone, visual }] — works for 2 to 4 items.
 */
const STRIP_COLS = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" };

const VALUE_TONES = { attention: "text-attention", success: "text-forest" };

export const StatStrip = ({ items }) => (
  <dl className={`grid gap-3 sm:gap-4 ${STRIP_COLS[items.length] || STRIP_COLS[4]}`}>
    {items.map((item) => (
      <div
        key={item.label}
        className="relative overflow-hidden rounded-[var(--radius-card)] border border-paper-border bg-white shadow-[var(--shadow-sheet)]"
      >
        <dt className="px-4 pt-2.5 pb-2 text-sm text-ink-muted sm:pt-3">{item.label}</dt>
        <div className="border-t border-margin/70" aria-hidden="true" />
        <dd className="flex items-center justify-between gap-3 px-4 pt-2">
          <span
            className={`text-2xl leading-tight font-semibold tracking-tight tabular-nums sm:text-[1.75rem] ${
              VALUE_TONES[item.tone] || "text-ink"
            }`}
          >
            {item.value}
          </span>
          {item.visual}
        </dd>
        {/* Equal heights side by side on desktop; no empty space when stacked on phones */}
        <p className="px-4 pt-0.5 pb-3 text-xs text-ink-muted empty:pb-2 sm:min-h-[1.75rem]">{item.note || ""}</p>
      </div>
    ))}
  </dl>
);

/* ---------- Status pills: colour is always paired with text ---------- */

const PILL_TONES = {
  success: "bg-forest-bg text-forest-dark border-forest-border",
  attention: "bg-attention-bg text-attention-dark border-attention-border",
  marigold: "bg-marigold-bg text-marigold-dark border-marigold-border",
  neutral: "bg-paper-muted text-ink-muted border-paper-border",
};

export const Pill = ({ tone = "neutral", children }) => (
  <span
    className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${PILL_TONES[tone]}`}
  >
    {children}
  </span>
);

const PAYMENT = {
  paid: { tone: "success", label: "Paid" },
  pending: { tone: "attention", label: "Fee pending" },
  waived: { tone: "neutral", label: "Waived" },
};

export const PaymentPill = ({ status }) => {
  const p = PAYMENT[status] || PAYMENT.pending;
  return <Pill tone={p.tone}>{p.label}</Pill>;
};

const BATCH_STATUS = {
  active: { tone: "success", label: "Active" },
  upcoming: { tone: "marigold", label: "Upcoming" },
  archived: { tone: "neutral", label: "Archived" },
};

export const BatchStatusPill = ({ status }) => {
  const s = BATCH_STATUS[status] || BATCH_STATUS.upcoming;
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export const SeatsPill = ({ enrolled = 0, capacity = 0 }) =>
  enrolled >= capacity ? (
    <Pill tone="attention">
      Full, {enrolled}/{capacity}
    </Pill>
  ) : (
    <Pill tone="neutral">
      {enrolled}/{capacity} seats
    </Pill>
  );

/* ---------- Buttons ---------- */

const BUTTON_VARIANTS = {
  // Primary has a darker bottom edge so it reads as pressable, not as a flat sticker
  primary:
    "bg-ink text-white shadow-[inset_0_-2px_0_var(--color-ink-900)] hover:bg-ink-700 active:translate-y-px active:shadow-none disabled:bg-ink-500 disabled:shadow-none",
  secondary: "bg-white text-ink border border-paper-border hover:border-ink-500 hover:bg-ink-100/40",
  danger: "bg-white text-attention border border-attention-border hover:bg-attention-bg",
  ghost: "text-ink hover:bg-ink-100/60",
};

export const Button = ({ variant = "primary", className = "", type = "button", ...props }) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-[background-color,border-color,transform] disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANTS[variant]} ${className}`}
    {...props}
  />
);

/* ---------- Feedback ---------- */

export const Notice = ({ tone = "error", children, onDismiss }) => {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
        isError
          ? "border-attention-border bg-attention-bg text-attention-dark"
          : "border-forest-border bg-forest-bg text-forest-dark"
      }`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-current opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export const Loading = ({ label = "Loading…" }) => (
  <div className="flex items-center gap-2 px-4 py-10 text-sm text-ink-muted" role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-100 border-t-ink motion-reduce:animate-none" />
    {label}
  </div>
);

export const EmptyState = ({ title, children, action }) => (
  <div className="px-4 py-12 text-center">
    {/* A short blank ruled line, like an unfilled register row */}
    <div className="mx-auto mb-4 flex w-28 flex-col gap-2" aria-hidden="true">
      <span className="h-px bg-rule" />
      <span className="h-px bg-rule" />
      <span className="ml-4 h-px w-16 bg-margin/60" />
    </div>
    <p className="font-medium text-ink">{title}</p>
    {children && <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{children}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/* ---------- Forms ---------- */

export const Field = ({ label, hint, error, children, htmlFor }) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink-text">
      {label}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    {error && <p className="mt-1 text-xs text-attention">{error}</p>}
  </div>
);

export const PasswordInput = ({ className = "", ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-muted hover:text-ink"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
};

export const inputClass =
  "w-full rounded-md border border-paper-border bg-white px-3 py-2 text-sm text-ink-text placeholder:text-ink-muted/70 transition-[border-color,box-shadow] focus:border-ink focus:shadow-[0_0_0_3px_var(--color-ink-100)] focus:outline-none disabled:bg-paper-muted";

/* ---------- Modal ---------- */

export const Modal = ({ open, title, onClose, children, footer, size = "md" }) => {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Runs only when the dialog opens/closes, so re-renders never steal focus from inputs
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Focus the first field (or the panel) so keyboard users land inside the dialog
    const first = panelRef.current?.querySelector("input, select, textarea, button:not([data-close])");
    (first || panelRef.current)?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 backdrop-blur-[2px] sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative my-8 w-full rounded-[var(--radius-sheet)] border border-paper-border bg-white shadow-[var(--shadow-lift)] focus:outline-none ${
          size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b border-paper-border px-5 py-4">
          <h2 id={titleId} className="font-serif text-xl font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            data-close
            onClick={onClose}
            className="rounded p-1 text-ink-muted hover:bg-paper-muted hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-paper-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ open, title, children, confirmLabel, tone = "primary", busy, onConfirm, onClose }) => (
  <Modal
    open={open}
    title={title}
    onClose={onClose}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
          {busy ? "Working…" : confirmLabel}
        </Button>
      </>
    }
  >
    <div className="text-sm text-ink-text">{children}</div>
  </Modal>
);
