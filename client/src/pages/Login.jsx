import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Field, Notice, PasswordInput, inputClass } from "../components/ui";
import { useSlowFlag } from "../hooks/useUi";
import AuthShell from "./AuthShell";

// Seeded by `npm run seed` in /server — shown so reviewers can sign in quickly
const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@edubatch.com", password: "Admin@123" },
  { role: "Teacher", email: "teacher@edubatch.com", password: "Teacher@123" },
  { role: "Student", email: "student@edubatch.com", password: "Student@123" },
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

        <Button type="submit" className="w-full" disabled={submitting || !email || !password}>
          {submitting ? "Logging in…" : "Log in"}
        </Button>
        {slow && (
          <p className="text-center text-sm text-ink-muted" role="status">
            Starting the server. The first login after a quiet period can take up to a minute.
          </p>
        )}
      </form>

      <div className="mt-6 border-t border-paper-border pt-4">
        <p className="text-sm text-ink-muted">Demo accounts</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => {
                setEmail(acc.email);
                setPassword(acc.password);
                setError("");
              }}
              className="rounded border border-paper-border px-2 py-2 text-sm text-ink hover:border-ink"
            >
              {acc.role}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
};

export default Login;
