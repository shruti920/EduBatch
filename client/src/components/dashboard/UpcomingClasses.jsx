import { CalendarClock } from "lucide-react";
import { EmptyState, Pill, Section } from "../ui";
import { formatTime } from "../../utils/format";

const dayLabel = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

// "4:00–6:00 PM" when both times share AM/PM, otherwise "11:00 AM–1:00 PM"
const timeRange = (start, end) => {
  if (!start) return "Time not set";
  const a = formatTime(start);
  if (!end) return a;
  const b = formatTime(end);
  const suffix = a.slice(-3);
  return /\s[AP]M$/i.test(a) && b.endsWith(suffix) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
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
          <li
            key={`${s.batch._id}-${s.date}`}
            className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-4"
          >
            {/* Phones: date and time on one line above the batch. Wider screens: a time column */}
            <div className="flex items-baseline gap-2 sm:w-36 sm:shrink-0 sm:flex-col sm:gap-0">
              <p className="font-medium text-ink">{dayLabel(s.date)}</p>
              <p className="text-ink-muted tabular-nums">{timeRange(s.startTime, s.endTime)}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink sm:truncate">{s.batch.name}</p>
              <p className="text-ink-muted sm:truncate">
                {[s.batch.subject, s.batch.venue, showTeacher && s.batch.teacher?.name].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="sm:shrink-0">
              <StatePill session={s} />
            </div>
          </li>
        ))}
      </ul>
    )}
  </Section>
);

export default UpcomingClasses;
