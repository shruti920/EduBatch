import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Avatar from "../../components/Avatar";
import { Button, ConfirmDialog, Field, PageHeader, PasswordInput, Pill, Section, inputClass } from "../../components/ui";
import { changePassword, logoutAllDevices, updateProfile } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { errorMessage, formatDate } from "../../utils/format";
import { PASSWORD_HINT, isPhone, passwordProblem } from "../../utils/validation";

const ROLE_LABEL = { admin: "Admin", teacher: "Teacher", student: "Student" };

const DetailsForm = ({ user, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name || "", phone: user.phone || "", avatar: user.avatar || "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const dirty = form.name !== (user.name || "") || form.phone !== (user.phone || "") || form.avatar !== (user.avatar || "");
  const update = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter your full name.";
    if (!isPhone(form.phone)) next.phone = "Enter a valid phone number.";
    if (form.avatar.trim() && !/^https:\/\/\S+$/i.test(form.avatar.trim())) next.avatar = "Use an https:// image link.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const saved = await updateProfile({ name: form.name.trim(), phone: form.phone.trim(), avatar: form.avatar.trim() });
      onSaved(saved);
      toast.success("Profile updated.");
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === "object") setErrors(fieldErrors);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4" noValidate>
      <div className="flex items-center gap-4">
        <Avatar name={form.name || user.name} src={form.avatar.trim()} size="lg" />
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium text-ink">{user.email}</p>
          <p className="text-ink-muted">Email can't be changed. Ask an admin if it's wrong.</p>
        </div>
      </div>
      <Field label="Full name" htmlFor="name" error={errors.name}>
        <input id="name" name="name" value={form.name} onChange={update} className={inputClass} autoComplete="name" />
      </Field>
      <Field label="Phone" htmlFor="phone" error={errors.phone} hint="Optional">
        <input id="phone" name="phone" value={form.phone} onChange={update} className={inputClass} autoComplete="tel" />
      </Field>
      <Field
        label="Avatar image URL"
        htmlFor="avatar"
        error={errors.avatar}
        hint="Optional. A public https:// link to a square image. Leave empty to show your initials."
      >
        <input
          id="avatar"
          name="avatar"
          value={form.avatar}
          onChange={update}
          className={inputClass}
          placeholder="https://…"
          inputMode="url"
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
};

const PasswordForm = ({ onChanged }) => {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const update = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.currentPassword) next.currentPassword = "Enter your current password.";
    const problem = passwordProblem(form.newPassword);
    if (problem) next.newPassword = problem;
    else if (form.newPassword === form.currentPassword) next.newPassword = "Choose a different password.";
    if (form.confirm !== form.newPassword) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const session = await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      onChanged(session);
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed. Other devices were signed out.");
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === "object") setErrors(fieldErrors);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4" noValidate>
      <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword}>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={update}
          className={inputClass}
        />
      </Field>
      <Field label="New password" htmlFor="newPassword" hint={PASSWORD_HINT} error={errors.newPassword}>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={update}
          className={inputClass}
        />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={errors.confirm}>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update}
          className={inputClass}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !form.currentPassword || !form.newPassword}>
          {saving ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
};

const Profile = () => {
  const { user, updateUser, applySession, clearSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmAll, setConfirmAll] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const signOutEverywhere = async () => {
    setSigningOut(true);
    try {
      await logoutAllDevices();
      clearSession();
      toast.success("Signed out of all devices.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
      setSigningOut(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Profile" description="Your details, password and sign-in sessions." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Your details"
          aside={
            <span className="flex items-center gap-2 text-sm text-ink-muted">
              <Pill>{ROLE_LABEL[user.role]}</Pill> since {formatDate(user.createdAt)}
            </span>
          }
        >
          {/* key: reset the form when the saved user changes */}
          <DetailsForm key={user.updatedAt} user={user} onSaved={updateUser} />
        </Section>

        <div className="space-y-6">
          <Section title="Change password">
            <PasswordForm onChanged={applySession} />
          </Section>

          <Section title="Sessions">
            <div className="space-y-3 p-4 text-sm">
              <p className="text-ink-muted">
                Lost a phone or used a shared computer? Sign out of EduBatch everywhere, including this browser.
              </p>
              {user.passwordChangedAt && (
                <p className="text-ink-muted">Password last changed {formatDate(user.passwordChangedAt)}.</p>
              )}
              <Button variant="danger" onClick={() => setConfirmAll(true)}>
                Sign out of all devices
              </Button>
            </div>
          </Section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAll}
        title="Sign out everywhere?"
        confirmLabel="Sign out everywhere"
        tone="danger"
        busy={signingOut}
        onConfirm={signOutEverywhere}
        onClose={() => setConfirmAll(false)}
      >
        Every device signed in to your account, including this one, will need to log in again.
      </ConfirmDialog>
    </DashboardLayout>
  );
};

export default Profile;
