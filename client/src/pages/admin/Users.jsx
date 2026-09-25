import { useState } from "react";
import { UserPlus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Avatar from "../../components/Avatar";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Loading,
  Modal,
  Notice,
  PageHeader,
  PasswordInput,
  Pill,
  Section,
  inputClass,
} from "../../components/ui";
import { createUser, getUsers, setUserStatus } from "../../api/userApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useApi, useDebouncedValue } from "../../hooks/useApi";
import { errorMessage, formatDate } from "../../utils/format";
import { PASSWORD_HINT, isEmail, isPhone, passwordProblem } from "../../utils/validation";

const ROLE_TABS = [
  { value: "all", label: "All" },
  { value: "student", label: "Students" },
  { value: "teacher", label: "Teachers" },
  { value: "admin", label: "Admins" },
];
const ROLE_LABEL = { admin: "Admin", teacher: "Teacher", student: "Student" };
const EMPTY_FORM = { name: "", email: "", phone: "", role: "teacher", password: "" };

const CreateUserModal = ({ open, onClose, onCreated }) => {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const update = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const close = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter the full name.";
    if (!isEmail(form.email)) next.email = "Enter a valid email address.";
    if (!isPhone(form.phone)) next.phone = "Enter a valid phone number.";
    const problem = passwordProblem(form.password);
    if (problem) next.password = problem;
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const res = await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password,
      });
      toast.success(`${res.message} Share the first password with them securely.`);
      onCreated(res.data.user);
      close();
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === "object") setErrors(fieldErrors);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Add a user"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating…" : "Create account"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Role" htmlFor="role">
          <select id="role" name="role" value={form.role} onChange={update} className={inputClass}>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </Field>
        <Field label="Full name" htmlFor="new-name" error={errors.name}>
          <input id="new-name" name="name" value={form.name} onChange={update} className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="new-email" error={errors.email}>
          <input id="new-email" name="email" type="email" value={form.email} onChange={update} className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="new-phone" error={errors.phone} hint="Optional">
          <input id="new-phone" name="phone" value={form.phone} onChange={update} className={inputClass} />
        </Field>
        <Field
          label="First password"
          htmlFor="new-password"
          error={errors.password}
          hint={`${PASSWORD_HINT} They get a welcome email (without the password) and can change it from Profile.`}
        >
          <PasswordInput
            id="new-password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update}
            className={inputClass}
          />
        </Field>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
};

const Users = () => {
  const { user: me } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(null); // { user, isActive }
  const [busy, setBusy] = useState(false);
  const debounced = useDebouncedValue(search);

  const params = { role, status, search: debounced.trim(), page };
  const { data, error, loading, reload } = useApi(() => getUsers(params), JSON.stringify(params));
  const users = data?.users || [];
  const pagination = data?.pagination;

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const confirmStatus = async () => {
    setBusy(true);
    try {
      const res = await setUserStatus(pending.user._id, pending.isActive);
      toast.success(res.message);
      if (res.data?.warning) toast.error(res.data.warning);
      setPending(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canToggle = (u) => u.role !== "admin" && u._id !== me._id;

  const statusButton = (u) =>
    canToggle(u) && (
      <Button
        variant={u.isActive ? "danger" : "secondary"}
        className="px-2.5 py-1 text-xs"
        onClick={() => setPending({ user: u, isActive: !u.isActive })}
      >
        {u.isActive ? "Deactivate" : "Reactivate"}
      </Button>
    );

  return (
    <DashboardLayout>
      <PageHeader
        title="Users"
        description="Create teacher and student accounts, and deactivate people who have left."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus size={16} aria-hidden="true" /> Add user
          </Button>
        }
      />

      <Section>
        <div className="flex flex-col gap-3 border-b border-paper-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by role">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={role === tab.value}
                onClick={() => changeFilter(setRole)(tab.value)}
                className={`rounded px-3 py-1.5 text-sm ${
                  role === tab.value ? "bg-ink font-medium text-white" : "text-ink hover:bg-paper-muted"
                }`}
              >
                {tab.label}
                {data?.counts && tab.value !== "all" && (
                  <span className="ml-1 tabular-nums opacity-70">{data.counts[tab.value]}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={status}
              onChange={(e) => changeFilter(setStatus)(e.target.value)}
              aria-label="Filter by status"
              className={`${inputClass} sm:w-36`}
            >
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Deactivated</option>
            </select>
            <input
              type="search"
              value={search}
              onChange={(e) => changeFilter(setSearch)(e.target.value)}
              placeholder="Search name, email, phone"
              aria-label="Search users"
              className={`${inputClass} sm:w-64`}
            />
          </div>
        </div>

        {error && (
          <div className="p-4">
            <Notice>{error}</Notice>
          </div>
        )}
        {loading && !data && <Loading />}

        {data && users.length === 0 && (
          <EmptyState title="No users match">Try another role, status or search.</EmptyState>
        )}

        {users.length > 0 && (
          <>
            {/* Mobile: cards */}
            <ul className={`divide-y divide-paper-border md:hidden ${loading ? "opacity-60" : ""}`}>
              {users.map((u) => (
                <li key={u._id} className="flex items-start gap-3 p-4">
                  <Avatar name={u.name} src={u.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{u.name}</p>
                    <p className="truncate text-sm text-ink-muted">{u.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Pill>{ROLE_LABEL[u.role]}</Pill>
                      {u.isActive ? <Pill tone="success">Active</Pill> : <Pill tone="attention">Deactivated</Pill>}
                    </div>
                  </div>
                  {statusButton(u)}
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className={`hidden overflow-x-auto md:block ${loading ? "opacity-60" : ""}`}>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-paper-border text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Phone</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border">
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} src={u.avatar} />
                          <div className="min-w-0">
                            <p className="font-medium text-ink">
                              {u.name} {u._id === me._id && <span className="text-ink-muted">(you)</span>}
                            </p>
                            <p className="text-ink-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{u.phone || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        {u.isActive ? <Pill tone="success">Active</Pill> : <Pill tone="attention">Deactivated</Pill>}
                      </td>
                      <td className="px-4 py-3 text-right">{statusButton(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-paper-border px-4 py-3 text-sm">
                <span className="text-ink-muted">
                  Page {pagination.page} of {pagination.pages}, {pagination.total} users
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= pagination.pages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Section>

      <CreateUserModal open={creating} onClose={() => setCreating(false)} onCreated={reload} />

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.isActive ? "Reactivate account?" : "Deactivate account?"}
        confirmLabel={pending?.isActive ? "Reactivate" : "Deactivate"}
        tone={pending?.isActive ? "primary" : "danger"}
        busy={busy}
        onConfirm={confirmStatus}
        onClose={() => setPending(null)}
      >
        {pending?.isActive
          ? `${pending?.user.name} will be able to log in again.`
          : `${pending?.user.name} will be signed out on every device and won't be able to log in. Their history is kept.`}
      </ConfirmDialog>
    </DashboardLayout>
  );
};

export default Users;
