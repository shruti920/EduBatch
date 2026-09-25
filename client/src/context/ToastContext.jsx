/* eslint-disable react-refresh/only-export-components -- provider and hook live together on purpose */
import { createContext, useContext, useEffect, useMemo } from "react";
import { Toaster, toast as sonner } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const ToastContext = createContext(null);

const SUCCESS_MS = 5000;

/**
 * Notifications, powered by Sonner: swipe (or flick) to dismiss, stacked with the
 * newest on top, paused while hovered. Success closes itself after 5 s; errors
 * stay until dismissed so nobody misses what went wrong.
 * The API is unchanged from v1: toast.success(text), toast.error(text), toast.dismiss(id).
 */
export const ToastProvider = ({ children }) => {
  const toast = useMemo(
    () => ({
      success: (text) => sonner.success(text, { duration: SUCCESS_MS }),
      error: (text) => sonner.error(text, { duration: Infinity }),
      dismiss: (id) => sonner.dismiss(id),
    }),
    []
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
      <Toaster
        position="bottom-right"
        visibleToasts={3}
        gap={10}
        closeButton
        icons={{
          success: <CheckCircle2 size={18} className="text-forest" aria-hidden="true" />,
          error: <AlertCircle size={18} className="text-attention" aria-hidden="true" />,
        }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "group relative flex w-full items-start gap-3 rounded-[var(--radius-card)] border border-paper-border bg-white py-3 pr-9 pl-4 text-sm text-ink-text shadow-[var(--shadow-lift)] sm:w-[360px]",
            success: "border-l-[3px] border-l-forest",
            error: "border-l-[3px] border-l-attention",
            icon: "mt-0.5 shrink-0",
            content: "flex-1",
            title: "leading-snug",
            closeButton:
              "!absolute !top-2.5 !right-2 !left-auto !h-6 !w-6 !transform-none !border-0 !bg-transparent text-ink-muted hover:!bg-paper-muted hover:text-ink rounded",
          },
        }}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};
