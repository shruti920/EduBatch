import { useDocumentTitle } from "../hooks/useUi";

// Shared frame for the login and registration pages
const AuthShell = ({ title, subtitle, children, footer }) => {
  useDocumentTitle(title);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-center font-serif text-2xl font-semibold text-ink">EduBatch</p>
        <div className="mt-6 rounded-md border border-paper-border bg-white p-6 sm:p-8">
          <h1 className="font-serif text-2xl font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
};

export default AuthShell;
