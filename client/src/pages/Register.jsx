import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Field, Notice, PasswordInput, inputClass } from "../components/ui";
import { useSlowFlag } from "../hooks/useUi";
import AuthShell from "./AuthShell";
import { PASSWORD_HINT, passwordProblem } from "../utils/validation";

const EMPTY = { name: "", email: "", phone: "", password: "", confirmPassword: "" };

const validate = (form) => {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (form.phone && !/^[0-9+\-\s]{7,20}$/.test(form.phone.trim())) errors.phone = "Enter a valid phone number.";
  const passwordError = passwordProblem(form.password);
  if (passwordError) errors.password = passwordError;
  if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords don't match.";
  return errors;
};

const Register = () => {
  const { register } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const slow = useSlowFlag(submitting);

  const update = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };

  const input = (name, props = {}, Component = "input") => (
    <Component
      id={name}
      name={name}
      value={form[name]}
      onChange={update}
      aria-invalid={Boolean(errors[name])}
      className={`${inputClass} ${errors[name] ? "border-attention" : ""}`}
      {...props}
    />
  );

  return (
    <AuthShell
      title="Create a student account"
      subtitle="Your institute will add you to your batch after you sign up."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-ink underline underline-offset-2 hover:text-marigold-dark">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {serverError && <Notice>{serverError}</Notice>}

        <Field label="Full name" htmlFor="name" error={errors.name}>
          {input("name", { autoComplete: "name" })}
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          {input("email", { type: "email", autoComplete: "email" })}
        </Field>
        <Field label="Phone (optional)" htmlFor="phone" error={errors.phone}>
          {input("phone", { type: "tel", autoComplete: "tel", inputMode: "tel" })}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="password" error={errors.password} hint={PASSWORD_HINT}>
            {input("password", { autoComplete: "new-password" }, PasswordInput)}
          </Field>
          <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
            {input("confirmPassword", { autoComplete: "new-password" }, PasswordInput)}
          </Field>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
        {slow && (
          <p className="text-center text-sm text-ink-muted" role="status">
            Starting the server. This can take up to a minute the first time.
          </p>
        )}
      </form>
    </AuthShell>
  );
};

export default Register;
