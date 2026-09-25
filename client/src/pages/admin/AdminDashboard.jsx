import { Link, useNavigate } from "react-router-dom";
import { Megaphone, Plus, UserPlus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  BatchStatusPill,
  Button,
  EmptyState,
  Loading,
  Notice,
  PageHeader,
  Section,
  SeatsPill,
  StatStrip,
} from "../../components/ui";
import { getAdminDashboard } from "../../api/dashboardApi";
import UpcomingClasses from "../../components/dashboard/UpcomingClasses";
import AdminAnalytics from "../../components/dashboard/AdminAnalytics";
import { useApi } from "../../hooks/useApi";
import { formatINR } from "../../utils/format";

const todayLabel = () =>
  new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data, error, loading } = useApi(getAdminDashboard, "admin-dashboard");

  const counts = data?.counts;
  const fees = data?.fees;
  const batches = data?.batches || [];
  const fullBatches = batches.filter((b) => b.isFull);

  return (
    <DashboardLayout>
      <PageHeader
        title="Dashboard"
        description={todayLabel()}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/notices?compose=1")}>
              <Megaphone size={16} aria-hidden="true" /> Post notice
            </Button>
            <Button variant="secondary" onClick={() => navigate("/enrollments?enroll=1")}>
              <UserPlus size={16} aria-hidden="true" /> Enroll student
            </Button>
            <Button onClick={() => navigate("/admin/batches?new=1")}>
              <Plus size={16} aria-hidden="true" /> New batch
            </Button>
          </>
        }
      />

      {error && <Notice>{error}</Notice>}
      {loading && !data && <Loading />}

      {data && (
        <>
          <StatStrip
            items={[
              { label: "Students", value: counts.students, note: `${counts.teachers} ${counts.teachers === 1 ? "teacher" : "teachers"}` },
              {
                label: "Active batches",
                value: counts.activeBatches,
                note: `${counts.upcomingBatches} upcoming`,
              },
              {
                label: "Fees collected",
                value: formatINR(fees.collected),
                note: `${formatINR(fees.collectedOnline)} online, ${formatINR(fees.collectedOffline)} offline`,
              },
              {
                label: "Fees pending",
                value: formatINR(fees.pending),
                note: `${fees.pendingCount} ${fees.pendingCount === 1 ? "student" : "students"}`,
                tone: fees.pendingCount ? "attention" : undefined,
              },
            ]}
          />

          <AdminAnalytics />

          <UpcomingClasses
            title="Today's classes"
            sessions={data.upcomingClasses}
            showTeacher
            emptyText="No more classes scheduled for today."
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <Section
              title="Batches"
              className="lg:col-span-2"
              aside={
                <Link to="/admin/batches" className="text-sm font-medium text-ink underline underline-offset-2">
                  Manage batches
                </Link>
              }
            >
              {batches.length === 0 ? (
                <EmptyState
                  title="No batches yet"
                  action={<Button onClick={() => navigate("/admin/batches?new=1")}>Create the first batch</Button>}
                >
                  Create a batch, assign a teacher, then enroll students.
                </EmptyState>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-paper-border text-ink-muted">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Batch</th>
                        <th className="px-4 py-2.5 font-medium">Teacher</th>
                        <th className="px-4 py-2.5 font-medium">Seats</th>
                        <th className="px-4 py-2.5 text-right font-medium">Fee</th>
                        <th className="px-4 py-2.5 font-medium">
                          <span className="sr-only">Links</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-border">
                      {batches.map((batch) => (
                        <tr key={batch._id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-ink">{batch.name}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                              <BatchStatusPill status={batch.status} />
                              {batch.subject}
                            </div>
                          </td>
                          <td className="px-4 py-3">{batch.teacher?.name || "—"}</td>
                          <td className="px-4 py-3">
                            <SeatsPill enrolled={batch.enrolledCount} capacity={batch.capacity} />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatINR(batch.fee)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <Link
                              to={`/enrollments?batchId=${batch._id}`}
                              className="text-sm text-ink underline underline-offset-2"
                            >
                              Roster
                            </Link>
                            <Link
                              to={`/attendance?batchId=${batch._id}`}
                              className="ml-3 text-sm text-ink underline underline-offset-2"
                            >
                              Attendance
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Needs attention">
              <ul className="divide-y divide-paper-border text-sm">
                <li className="px-4 py-3">
                  <p className="font-medium text-ink">Attendance today</p>
                  <p className="mt-0.5 text-ink-muted">
                    {counts.activeBatches === 0
                      ? "No active batches."
                      : data.attendance.pendingToday === 0
                        ? "Marked for every active batch."
                        : `Not marked for ${data.attendance.pendingToday} of ${counts.activeBatches} active batches.`}
                  </p>
                  {data.attendance.pendingToday > 0 && (
                    <Link to="/attendance" className="mt-1 inline-block text-ink underline underline-offset-2">
                      Mark attendance
                    </Link>
                  )}
                </li>
                <li className="px-4 py-3">
                  <p className="font-medium text-ink">Pending fees</p>
                  <p className="mt-0.5 text-ink-muted">
                    {fees.pendingCount === 0
                      ? "No pending fees."
                      : `${fees.pendingCount} ${fees.pendingCount === 1 ? "enrollment" : "enrollments"}, ${formatINR(fees.pending)} due.`}
                  </p>
                  {fees.pendingCount > 0 && (
                    <Link
                      to="/enrollments?payment=pending"
                      className="mt-1 inline-block text-ink underline underline-offset-2"
                    >
                      View pending
                    </Link>
                  )}
                </li>
                <li className="px-4 py-3">
                  <p className="font-medium text-ink">Full batches</p>
                  {fullBatches.length === 0 ? (
                    <p className="mt-0.5 text-ink-muted">Every batch has open seats.</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-ink-muted">
                      {fullBatches.map((b) => (
                        <li key={b._id}>
                          {b.name} ({b.enrolledCount}/{b.capacity})
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              </ul>
            </Section>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
