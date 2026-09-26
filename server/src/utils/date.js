
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
