import { normalizeDate } from "./date.js";

const APP_TIMEZONE = () => process.env.APP_TIMEZONE || "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Current date and minute-of-day in the institute's timezone.
 * Returns { todayKey: Date at 00:00Z of the local date, minutes: 0..1439 }.
 */
export const localNow = (now = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return {
    todayKey: new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

const toMinutes = (hhmm) => {
  if (!/^\d{2}:\d{2}$/.test(hhmm || "")) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Expands batch schedules into concrete upcoming class sessions.
 *
 * - Only non-archived batches with schedule days set.
 * - Respects the batch's start/end dates.
 * - Today's classes that already ended are skipped; one in progress is "live".
 * - An "upcoming" batch shows its first class so students know when it starts.
 *
 * @param {Array} batches  Mongoose docs or plain objects
 * @param {{ days?: number, limit?: number, now?: Date }} options
 */
export const upcomingClasses = (batches, { days = 7, limit = 6, now = new Date() } = {}) => {
  const { todayKey, minutes: nowMinutes } = localNow(now);
  const sessions = [];

  for (let offset = 0; offset < days; offset += 1) {
    const dateKey = new Date(todayKey.getTime() + offset * DAY_MS);
    const weekday = WEEKDAYS[dateKey.getUTCDay()];

    for (const batch of batches) {
      if (!batch || batch.status === "archived") continue;
      const schedule = batch.schedule || {};
      if (!schedule.days?.includes(weekday)) continue;
      if (batch.startDate && dateKey < normalizeDate(batch.startDate)) continue;
      if (batch.endDate && dateKey > normalizeDate(batch.endDate)) continue;

      const start = toMinutes(schedule.startTime);
      const end = toMinutes(schedule.endTime);

      let state = offset === 0 ? "today" : "later";
      if (offset === 0 && end !== null && end <= nowMinutes) continue; // already over
      if (offset === 0 && start !== null && start <= nowMinutes) state = "live";

      sessions.push({
        batch: {
          _id: batch._id,
          name: batch.name,
          subject: batch.subject,
          status: batch.status,
          venue: schedule.venue || "",
          teacher: batch.teacher?.name ? { _id: batch.teacher._id, name: batch.teacher.name } : undefined,
        },
        date: dateKey.toISOString().slice(0, 10),
        day: weekday,
        startTime: schedule.startTime || null,
        endTime: schedule.endTime || null,
        state,
        isFirstClass: batch.status === "upcoming",
        sortKey: dateKey.getTime() + (start ?? 0) * 60 * 1000,
      });
    }
  }

  // An upcoming batch only needs its first session listed, not every repeat
  const seenUpcoming = new Set();
  return sessions
    .sort((a, b) => a.sortKey - b.sortKey)
    .filter((s) => {
      if (!s.isFirstClass) return true;
      const id = s.batch._id.toString();
      if (seenUpcoming.has(id)) return false;
      seenUpcoming.add(id);
      return true;
    })
    .slice(0, limit)
    .map(({ sortKey, ...rest }) => rest); // eslint-disable-line no-unused-vars
};
