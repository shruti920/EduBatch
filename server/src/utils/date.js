// Attendance is stored one document per batch per calendar day, keyed at 00:00 UTC.
// "Today" is resolved in the institute's timezone (IST by default), otherwise
// anything before 05:30 IST would be counted as the previous day.
const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

export const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

export const todayKey = () => {
  // en-CA formats as YYYY-MM-DD
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date());
  return new Date(`${localDate}T00:00:00.000Z`);
};
