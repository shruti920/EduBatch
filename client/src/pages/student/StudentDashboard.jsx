import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import BatchCard from "../../components/batches/BatchCard";
import UpcomingClasses from "../../components/dashboard/UpcomingClasses";
import AttendanceRing from "../../components/dashboard/AttendanceRing";
import { getStudentDashboard } from "../../api/dashboardApi";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { usePayFee } from "../../hooks/usePayFee";
import NoticeCard from "../../components/notices/NoticeCard";
import { getNotices } from "../../api/noticeApi";
import { Button, EmptyState, Loading, Notice, PageHeader, PaymentPill, Section, StatStrip } from "../../components/ui";
import { firstName, formatDate, formatINR, percent } from "../../utils/format";

const StudentDashboard = () => {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi(getStudentDashboard, "student-dashboard");
  const { pay, payingId, labelFor } = usePayFee({ onPaid: reload });
  const notices = useApi(() => getNotices({ limit: 3 }), "dashboard-notices");
  // Pinned notices always come back first; the dashboard shows the top 3
  const latestNotices = (notices.data?.notices || []).slice(0, 3);
  const enrollments = data?.enrollments || [];

  return (
    <DashboardLayout>
      <PageHeader
        title={`Hello, ${firstName(user?.name)}`}
        documentTitle="Dashboard"
        description="Your batches, fees and attendance."
      />

      {error && <Notice>{error}</Notice>}
      {loading && !data && <Loading />}

      {data && (
        <>
          <StatStrip
            items={[
              { label: "Enrolled batches", value: data.totalEnrolled },
              {
                label: "Attendance",
                value: percent(data.attendance.rate),
                note: data.attendance.total
                  ? `${data.attendance.attended} of ${data.attendance.total} classes`
                  : "No classes recorded yet",
                tone: data.attendance.rate !== null && data.attendance.rate < 75 ? "attention" : undefined,
                visual: <AttendanceRing rate={data.attendance.total ? data.attendance.rate : null} />,
              },
              {
                label: "Fees due",
                value: formatINR(data.fees.pendingAmount),
                note: data.fees.pendingCount
                  ? `${data.fees.pendingCount} batch${data.fees.pendingCount > 1 ? "es" : ""}`
                  : "Nothing due",
                tone: data.fees.pendingCount ? "attention" : "success",
              },
            ]}
          />

          <UpcomingClasses sessions={data.upcomingClasses} showTeacher emptyText="No classes in the next 7 days for your batches." />

          <Section
            title="Latest notices"
            aside={
              <Link to="/notices" className="text-sm font-medium text-ink underline underline-offset-2">
                View all
              </Link>
            }
          >
            {notices.loading && !notices.data ? (
              <Loading />
            ) : latestNotices.length === 0 ? (
              <EmptyState title="No notices yet">Updates from your institute and teachers will appear here.</EmptyState>
            ) : (
              <div className="grid gap-3 p-4 md:grid-cols-3">
                {latestNotices.map((n) => (
                  <NoticeCard key={n._id} notice={n} compact />
                ))}
              </div>
            )}
          </Section>

          {enrollments.length === 0 ? (
            <Section>
              <EmptyState title="You're not in a batch yet">
                Your institute adds you to a batch after admission. Contact the office if this looks wrong.
              </EmptyState>
            </Section>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {enrollments
                .filter((e) => e.batch)
                .map((e) => (
                  <BatchCard
                    key={e._id}
                    batch={e.batch}
                    badges={<PaymentPill status={e.paymentStatus} />}
                    details={[
                      { label: "Teacher", value: e.batch.teacher?.name || "—" },
                      { label: "Fee", value: formatINR(e.batch.fee) },
                      {
                        label: "Attendance",
                        value: e.attendance.total
                          ? `${percent(e.attendance.rate)} (${e.attendance.attended}/${e.attendance.total})`
                          : "No classes recorded yet",
                      },
                      { label: "Joined", value: formatDate(e.enrolledAt) },
                    ]}
                  >
                    {e.paymentStatus === "pending" && (
                      <Button onClick={() => pay(e)} disabled={payingId === e._id} className="py-1.5">
                        {labelFor(e._id, `Pay ${formatINR(e.batch.fee)}`)}
                      </Button>
                    )}
                    <Link to="/attendance" className="self-center text-ink underline underline-offset-2">
                      Attendance details
                    </Link>
                    {e.paymentStatus === "paid" && (
                      <Link to="/payments" className="self-center text-ink underline underline-offset-2">
                        Receipt
                      </Link>
                    )}
                  </BatchCard>
                ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default StudentDashboard;
