/**
 * Attendance as a ring, with a small notch at 75% — the attendance most coaching
 * institutes (and boards) require. Below it the ring turns margin red.
 */
const R = 16;
const C = 2 * Math.PI * R;

const AttendanceRing = ({ rate, size = 44 }) => {
  if (rate === null || rate === undefined) return null;
  const value = Math.max(0, Math.min(100, rate));
  const low = value < 75;
  const notch = (75 / 100) * 360 - 90; // degrees, starting from 12 o'clock
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`${value}% attendance`}>
      <circle cx="20" cy="20" r={R} fill="none" stroke="var(--color-paper-muted)" strokeWidth="4.5" />
      <circle
        cx="20"
        cy="20"
        r={R}
        fill="none"
        stroke={low ? "var(--color-attention)" : "var(--color-forest)"}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * C} ${C}`}
        transform="rotate(-90 20 20)"
      />
      <line
        x1="20"
        y1="1.5"
        x2="20"
        y2="7"
        stroke="var(--color-ink-text)"
        strokeWidth="1.4"
        transform={`rotate(${notch + 90} 20 20)`}
      />
    </svg>
  );
};

export default AttendanceRing;
