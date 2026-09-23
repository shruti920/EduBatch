/* eslint-disable react-refresh/only-export-components -- provider and hook live together on purpose */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

const ToastContext = createContext(null);
const MAX_TOASTS = 3;
const SUCCESS_MS = 5000;

/**
 * One toast. Success toasts close themselves after 5s (paused while hovered or
 * focused); error toasts stay until closed, so nobody misses what went wrong.
 */
const ToastItem = ({ toast, onDismiss }) => {
  const isError = toast.tone === "error";
  const [paused, setPaused] = useState(false);
  const remaining = useRef(SUCCESS_MS);
  const startedAt = useRef(0);

  useEffect(() => {
    if (isError || paused) return undefined;
    startedAt.current = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [isError, paused, onDismiss, toast.id]);

  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`toast-enter pointer-events-auto flex w-full items-start gap-3 rounded-md border bg-white px-4 py-3 text-sm shadow-lg ${
        isError ? "border-attention-border" : "border-forest-border"
      }`}
    >
      <Icon size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${isError ? "text-attention" : "text-forest"}`} />
      <p className="flex-1 text-ink-text">{toast.text}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 rounded p-0.5 text-ink-muted hover:bg-paper-muted hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((tone, text) => {
    nextId.current += 1;
    const id = nextId.current;
    // Newest at the bottom; keep at most 3 on screen
    setToasts((list) => [...list, { id, tone, text }].slice(-MAX_TOASTS));
    return id;
  }, []);

  const toast = useMemo(
    () => ({
      success: (text) => push("success", text),
      error: (text) => push("error", text),
      dismiss,
    }),
    [push, dismiss],
  );

  // Session expiry is detected inside the axios interceptor, outside React
  useEffect(() => {
    const onLogout = (e) => {
      if (e.detail?.reason === "expired") toast.error("Your session expired. Log in again.");
    };
    window.addEventListener("edubatch-logout", onLogout);
    return () => window.removeEventListener("edubatch-logout", onLogout);
  }, [toast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};
