import { REQUIRED_ATTENDANCE } from "../../utils/attendance";

/**
 * Attendance as a ring: green at 75% and above (what most coaching institutes
 * require), red below. The ring only shows progress — the 75% rule is explained in
 * words next to it, because an unlabelled marker means nothing to a student.
 */
const R = 15;
const C = 2 * Math.PI * R;
const STROKE = 4.5;

const AttendanceRing = ({ rate, size = 44 }) => {
  if (rate === null || rate === undefined) return null;
  const value = Math.max(0, Math.min(100, rate));
  const color = value < REQUIRED_ATTENDANCE ? "var(--color-attention)" : "var(--color-forest)";

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <circle cx="20" cy="20" r={R} fill="none" stroke="var(--color-paper-muted)" strokeWidth={STROKE} />
      {value >= 100 ? (
        // A plain full circle, so there's no seam where the arc's ends would meet
        <circle cx="20" cy="20" r={R} fill="none" stroke={color} strokeWidth={STROKE} />
      ) : (
        value > 0 && (
          <circle
            cx="20"
            cy="20"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${(value / 100) * C} ${C}`}
            transform="rotate(-90 20 20)"
          />
        )
      )}
    </svg>
  );
};

export default AttendanceRing;
