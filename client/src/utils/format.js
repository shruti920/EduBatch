export const formatINR = (amount = 0) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// "18:30" → "6:30 PM"
export const formatTime = (time24) => {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
};

export const formatSchedule = (schedule) => {
  if (!schedule?.days?.length) return "Schedule not set";
  const days = schedule.days.join(", ");
  if (!schedule.startTime || !schedule.endTime) return days;
  return `${days} · ${formatTime(schedule.startTime)}–${formatTime(schedule.endTime)}`;
};

export const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const HONORIFICS = /\b(dr|prof|mr|mrs|ms|shri|smt)\.?\s+/gi;

// "Prof. Alok Shrivastava" → "Alok", "Dr. R. K. Verma" → "R." is skipped → "Verma"
export const firstName = (name = "") => {
  const words = name.replace(HONORIFICS, "").trim().split(/\s+/).filter(Boolean);
  // Skip leading initials like "R." / "K." so "R. K. Verma" greets as "Verma"
  const real = words.find((w) => w.replace(/\./g, "").length > 1);
  return real || words[0] || "there";
};

// "Dr. R. K. Verma" → "RV", "Aditya Nair" → "AN"
export const initials = (name = "") => {
  const words = name
    .replace(HONORIFICS, "")
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);
  if (!words.length) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
};

// Local calendar date as YYYY-MM-DD (toISOString would give the UTC date)
export const todayLocal = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

// "just now", "5 minutes ago", "yesterday", "3 days ago"; older than a week → date
export const timeAgo = (value) => {
  if (!value) return "";
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  return formatDate(value);
};

export const percent = (value) => (value === null || value === undefined ? "—" : `${value}%`);

// Builds a real CSV (quotes escaped) and downloads it via a Blob.
// A data: URI breaks on "#" and large files, so it isn't used here.
export const downloadCsv = (filename, headers, rows) => {
  const escape = (cell) => {
    const value = cell === null || cell === undefined ? "" : String(cell);
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const errorMessage = (err, fallback = "Something went wrong. Try again.") =>
  err?.response?.data?.message || (err?.message === "Network Error" ? "Can't reach the server." : err?.message) || fallback;
