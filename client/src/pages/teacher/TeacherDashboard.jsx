import { Link } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import BatchCard from "../../components/batches/BatchCard";
import UpcomingClasses from "../../components/dashboard/UpcomingClasses";
import { EmptyState, Loading, Notice, PageHeader, Pill, Section, StatStrip } from "../../components/ui";
import { getTeacherDashboard } from "../../api/dashboardApi";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { firstName } from "../../utils/format";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { data, error, loading } = useApi(getTeacherDashboard, "teacher-dashboard");
  const batches = data?.batches || [];

  return (
    <DashboardLayout>
      <PageHeader
        title={`Hello, ${firstName(user?.name)}`}
        documentTitle="Dashboard"
        description="Your batches and today's attendance."
      />

      {error && <Notice>{error}</Notice>}
      {loading && !data && <Loading />}

      {data && (
        <>
          <StatStrip
            items={[
              { label: "Your batches", value: data.totalBatches, note: `${data.activeBatches} active` },
              { label: "Students", value: data.totalStudents },
              {
                label: "Attendance today",
                value: data.activeBatches ? `${data.markedToday}/${data.activeBatches}` : "—",
                note: data.activeBatches ? "active batches marked" : "no active batches",
                tone: data.activeBatches && data.markedToday < data.activeBatches ? "attention" : undefined,
              },
            ]}
          />

          <UpcomingClasses sessions={data.upcomingClasses} />

          {batches.length === 0 ? (
            <Section>
              <EmptyState title="No batches assigned yet">
                When an admin assigns you to a batch, it will appear here.
              </EmptyState>
            </Section>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {batches.map((batch) => (
                <BatchCard
                  key={batch._id}
                  batch={batch}
                  badges={
                    batch.status === "active" &&
                    (batch.markedToday ? (
                      <Pill tone="success">Marked today</Pill>
                    ) : (
                      <Pill tone="attention">Not marked today</Pill>
                    ))
                  }
                  details={[{ label: "Students", value: `${batch.enrolledCount} of ${batch.capacity}` }]}
                >
                  <Link to={`/enrollments?batchId=${batch._id}`} className="text-ink underline underline-offset-2">
                    View roster
                  </Link>
                  <Link to={`/notices?compose=1&batch=${batch._id}`} className="text-ink underline underline-offset-2">
                    Post notice
                  </Link>
                  {batch.status === "active" && (
                    <Link
                      to={`/attendance?batchId=${batch._id}`}
                      className="font-medium text-ink underline underline-offset-2"
                    >
                      {batch.markedToday ? "Edit today's attendance" : "Mark attendance"}
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

export default TeacherDashboard;
