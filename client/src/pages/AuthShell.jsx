import { useDocumentTitle } from "../hooks/useUi";
import { Logo } from "../components/brand/Logo";
import RegisterScene from "../components/brand/RegisterScene";

/**
 * Frame for login, register, forgot and reset password.
 * Desktop: the notebook page on the left (brand + a live register), form on the right.
 * Mobile: logo and form only.
 */
const AuthShell = ({ title, subtitle, children, footer, showScene = true }) => {
  useDocumentTitle(title);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Brand side (desktop) */}
      <aside className="paper-ruled relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:py-10 lg:pr-12 lg:pl-28 xl:pl-32">
        <div className="absolute inset-y-0 left-16 w-1 border-x border-margin/70 xl:left-20" aria-hidden="true" />
        <Logo size={34} textClassName="text-2xl" />

        <div className="max-w-lg">
          <h2 className="font-serif text-[2.6rem] leading-[1.08] font-semibold tracking-tight text-ink xl:text-5xl">
            Batches, fees and attendance in one register.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
            Mark today&apos;s attendance in a minute, collect fees online with a receipt, and post notices to the batch
            that needs them.
          </p>
          {showScene && (
            <div className="mt-10">
              <RegisterScene />
            </div>
          )}
        </div>

        <p className="text-sm text-ink-muted">For coaching institutes, tuition centres and bootcamps.</p>
      </aside>

      {/* Form side */}
      <main className="paper-ruled flex min-h-screen flex-col px-4 py-8 sm:px-8 lg:min-h-0 lg:bg-white lg:bg-none lg:py-10">
        <div className="lg:hidden">
          <Logo size={28} />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[400px]">
            <div className="rounded-[var(--radius-sheet)] border border-paper-border bg-white p-6 shadow-[var(--shadow-sheet)] sm:p-8 lg:border-0 lg:p-0 lg:shadow-none">
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{title}</h1>
              {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
              <div className="mt-7">{children}</div>
            </div>
            {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthShell;
