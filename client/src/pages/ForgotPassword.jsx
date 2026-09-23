import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Field, Notice, inputClass } from "../components/ui";
import { requestPasswordReset } from "../api/authApi";
import { errorMessage } from "../utils/format";
import { isEmail } from "../utils/validation";
import { useSlowFlag } from "../hooks/useUi";
import AuthShell from "./AuthShell";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const slow = useSlowFlag(submitting);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      setSentMessage(await requestPasswordReset(email.trim()));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll email you a link to set a new password."
      footer={
        <Link to="/login" className="font-medium text-ink underline underline-offset-2 hover:text-marigold-dark">
          Back to log in
        </Link>
      }
    >
      {sentMessage ? (
        <div className="space-y-4">
          <Notice tone="success">{sentMessage}</Notice>
          <p className="text-sm text-ink-muted">
            Check your inbox and spam folder. The link works once. Didn't get it?{" "}
            <button
              type="button"
              className="font-medium text-ink underline underline-offset-2"
              onClick={() => setSentMessage("")}
            >
              Send again
            </button>
          </p>
        </div>
      ) : (
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
          <Button type="submit" className="w-full" disabled={submitting || !email}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
          {slow && (
            <p className="text-center text-sm text-ink-muted" role="status">
              Starting the server. This can take up to a minute after a quiet period.
            </p>
          )}
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
