import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Presentation, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, Field, Notice, PasswordInput, inputClass } from "../components/ui";
import { useSlowFlag } from "../hooks/useUi";
import AuthShell from "./AuthShell";

// Seeded by `npm run seed` in /server — shown so reviewers can sign in quickly
const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@edubatch.com", password: "Admin@123", icon: ShieldCheck },
  { role: "Teacher", email: "teacher@edubatch.com", password: "Teacher@123", icon: Presentation },
  { role: "Student", email: "student@edubatch.com", password: "Student@123", icon: GraduationCap },
];

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // The free Render instance sleeps when idle; the first request can take up to a minute
  const slow = useSlowFlag(submitting);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      // On success the route guard redirects to the right dashboard
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Use the email your institute registered you with."
      footer={
        <>
          New student?{" "}
          <Link to="/register" className="font-medium text-ink underline underline-offset-2 hover:text-marigold-dark">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Notice>{error}</Notice>}

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        <p className="-mt-2 text-right text-sm">
          <Link to="/forgot-password" className="text-ink-muted underline underline-offset-2 hover:text-ink">
            Forgot password?
          </Link>
        </p>

        <Button type="submit" className="w-full" disabled={submitting || !email || !password}>
          {submitting ? "Logging in…" : "Log in"}
        </Button>
        {slow && (
          <p className="text-center text-sm text-ink-muted" role="status">
            Starting the server. The first login after a quiet period can take up to a minute.
          </p>
        )}
      </form>

      <div className="mt-8">
        <p className="text-sm font-medium text-ink-text">Try a demo account</p>
        <p className="text-xs text-ink-muted">Fills in the form. Each role sees a different app.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map(({ role, email: demoEmail, password: demoPassword, icon: Icon }) => {
            const selected = email === demoEmail;
            return (
              <button
                key={role}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setEmail(demoEmail);
                  setPassword(demoPassword);
                  setError("");
                }}
                className={`flex flex-col items-start gap-2 rounded-[var(--radius-card)] border px-3 py-2.5 text-left text-sm transition-colors ${
                  selected
                    ? "border-ink bg-ink-100 text-ink"
                    : "border-paper-border bg-white text-ink-text hover:border-ink-500"
                }`}
              >
                <Icon size={18} aria-hidden="true" className="text-ink" />
                <span className="font-medium">{role}</span>
              </button>
            );
          })}
        </div>
      </div>
    </AuthShell>
  );
};

export default Login;
