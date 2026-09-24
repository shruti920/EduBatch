import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Field, Notice, PasswordInput, inputClass } from "../components/ui";
import { resetPassword } from "../api/authApi";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../utils/format";
import { PASSWORD_HINT, passwordProblem } from "../utils/validation";
import AuthShell from "./AuthShell";

const ResetPassword = () => {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const linkLooksValid = /^[a-f0-9]{64}$/.test(token);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const next = {};
    const problem = passwordProblem(password);
    if (problem) next.password = problem;
    if (confirm !== password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const message = await resetPassword(token, password);
      toast.success(message);
      navigate("/login", { replace: true });
    } catch (err) {
      setServerError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const footer = (
    <Link to="/login" className="font-medium text-ink underline underline-offset-2 hover:text-marigold-dark">
      Back to log in
    </Link>
  );

  if (!linkLooksValid) {
    return (
      <AuthShell title="Reset link not valid" footer={footer}>
        <Notice>This link is incomplete or broken. Request a new one.</Notice>
        <Link to="/forgot-password" className="mt-4 inline-block text-sm font-medium text-ink underline underline-offset-2">
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="You'll be signed out everywhere and can log in again." footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {serverError && (
          <Notice>
            {serverError}{" "}
            <Link to="/forgot-password" className="font-medium underline underline-offset-2">
              Request a new link
            </Link>
          </Notice>
        )}
        <Field label="New password" htmlFor="password" hint={PASSWORD_HINT} error={errors.password}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" error={errors.confirm}>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Button type="submit" className="w-full" disabled={submitting || !password || !confirm}>
          {submitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;
