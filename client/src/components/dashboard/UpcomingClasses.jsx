import { CalendarClock } from "lucide-react";
import { EmptyState, Pill, Section } from "../ui";
import { formatTime } from "../../utils/format";

const dayLabel = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

const StatePill = ({ session }) => {
  if (session.state === "live") return <Pill tone="success">In progress</Pill>;
  if (session.isFirstClass) return <Pill tone="marigold">First class</Pill>;
  if (session.state === "today") return <Pill tone="attention">Today</Pill>;
  return null;
};

/**
 * Class sessions expanded from batch schedules on the server (see utils/schedule.js).
 * sessions: [{ batch, date, day, startTime, endTime, state, isFirstClass }]
 */
const UpcomingClasses = ({ sessions = [], title = "Upcoming classes", emptyText, showTeacher = false }) => (
  <Section
    title={
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <CalendarClock size={17} aria-hidden="true" /> {title}
      </h2>
    }
  >
    {sessions.length === 0 ? (
      <EmptyState title="Nothing scheduled">{emptyText || "No classes in the next 7 days."}</EmptyState>
    ) : (
      <ul className="divide-y divide-paper-border">
        {sessions.map((s) => (
          <li key={`${s.batch._id}-${s.date}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <div className="w-28 shrink-0">
              <p className="font-medium text-ink">{dayLabel(s.date)}</p>
              <p className="text-ink-muted tabular-nums">
                {s.startTime ? `${formatTime(s.startTime)}${s.endTime ? `–${formatTime(s.endTime)}` : ""}` : "Time not set"}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{s.batch.name}</p>
              <p className="truncate text-ink-muted">
                {[s.batch.subject, s.batch.venue, showTeacher && s.batch.teacher?.name].filter(Boolean).join(" · ")}
              </p>
            </div>
            <StatePill session={s} />
          </li>
        ))}
      </ul>
    )}
  </Section>
);

export default UpcomingClasses;
