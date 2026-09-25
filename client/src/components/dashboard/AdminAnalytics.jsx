import { useId } from "react";
import { Loading, Notice, Section } from "../ui";
import { getAdminAnalytics } from "../../api/dashboardApi";
import { useApi } from "../../hooks/useApi";
import { formatINR } from "../../utils/format";

// ₹45k, ₹1.2L — how Indian institutes talk about fees
const compactINR = (n) => {
  if (!n) return "₹0";
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n % 1e5 === 0 ? 0 : 1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1)}k`;
  return `₹${n}`;
};

const W = 560;
const H = 220;
const PAD = { top: 26, right: 8, bottom: 30, left: 8 };

/**
 * Fees received per month. Online payments are solid ink; offline ones are
 * pen-hatched. The current month is the darkest bar.
 */
const RevenueChart = ({ months }) => {
  const hatchId = useId().replace(/:/g, "");
  const max = Math.max(...months.map((m) => m.revenue), 1);
  const innerH = H - PAD.top - PAD.bottom;
  const slot = (W - PAD.left - PAD.right) / months.length;
  const barW = Math.min(46, slot * 0.56);
  const y = (v) => PAD.top + innerH - (v / max) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby={`${hatchId}-t`}>
      <title id={`${hatchId}-t`}>Fees received per month</title>
      <defs>
        <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-ink)" strokeWidth="2" />
        </pattern>
      </defs>
      {/* Notebook rules as gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={0}
          x2={W}
          y1={PAD.top + innerH * t}
          y2={PAD.top + innerH * t}
          stroke="var(--color-rule)"
          strokeWidth="1"
        />
      ))}
      {months.map((m, i) => {
        const cx = PAD.left + slot * i + slot / 2;
        const x = cx - barW / 2;
        const current = i === months.length - 1;
        const onlineTop = y(m.online);
        const totalTop = y(m.revenue);
        const base = PAD.top + innerH;
        return (
          <g key={m.month} opacity={current ? 1 : 0.72}>
            {m.online > 0 && (
              <rect x={x} y={onlineTop} width={barW} height={base - onlineTop} rx="3" fill="var(--color-ink)" />
            )}
            {m.offline > 0 && (
              <rect
                x={x}
                y={totalTop}
                width={barW}
                height={onlineTop - totalTop}
                rx="3"
                fill={`url(#${hatchId})`}
                stroke="var(--color-ink)"
                strokeWidth="1.2"
              />
            )}
            {m.revenue > 0 && (
              <text x={cx} y={totalTop - 7} textAnchor="middle" className="fill-ink-text text-[12px] font-semibold tabular-nums">
                {compactINR(m.revenue)}
              </text>
            )}
            <text
              x={cx}
              y={H - 8}
              textAnchor="middle"
              className={`text-[12px] ${current ? "fill-ink font-semibold" : "fill-ink-muted"}`}
            >
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/** Attendance rate per month against the 75% line most institutes require. */
const AttendanceChart = ({ months }) => {
  const w = 300;
  const h = 220;
  const pad = { top: 20, right: 14, bottom: 30, left: 34 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const x = (i) => pad.left + (months.length === 1 ? innerW / 2 : (innerW * i) / (months.length - 1));
  const y = (v) => pad.top + innerH - (v / 100) * innerH;

  // Break the line where a month had no attendance marked
  const segments = [];
  let current = [];
  months.forEach((m, i) => {
    if (m.attendanceRate === null) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push([x(i), y(m.attendanceRate)]);
  });
  if (current.length) segments.push(current);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Attendance rate per month">
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={pad.left} x2={w - pad.right} y1={y(v)} y2={y(v)} stroke="var(--color-rule)" />
          <text x={pad.left - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-muted text-[11px] tabular-nums">
            {v}%
          </text>
        </g>
      ))}
      <line
        x1={pad.left}
        x2={w - pad.right}
        y1={y(75)}
        y2={y(75)}
        stroke="var(--color-margin)"
        strokeDasharray="4 4"
        strokeWidth="1.3"
      />
      <text x={w - pad.right} y={y(75) - 5} textAnchor="end" className="fill-attention text-[11px]">
        75% required
      </text>
      {segments.map((pts, i) => (
        <polyline
          key={i}
          points={pts.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {months.map((m, i) =>
        m.attendanceRate === null ? null : (
          <circle
            key={m.month}
            cx={x(i)}
            cy={y(m.attendanceRate)}
            r="3.8"
            fill={m.attendanceRate < 75 ? "var(--color-attention)" : "var(--color-ink)"}
            stroke="#fff"
            strokeWidth="1.5"
          />
        )
      )}
      {months.map((m, i) => (
        <text key={m.month} x={x(i)} y={h - 8} textAnchor="middle" className="fill-ink-muted text-[11px]">
          {m.label}
        </text>
      ))}
    </svg>
  );
};

// "₹45,000 received in September, ₹12,000 more than August."
const comparison = (months) => {
  const now = months.at(-1);
  const prev = months.at(-2);
  const head = `${formatINR(now.revenue)} received in ${now.label} so far`;
  if (!prev) return `${head}.`;
  const diff = now.revenue - prev.revenue;
  if (diff === 0) return `${head}, the same as ${prev.label}.`;
  return `${head}, ${formatINR(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than ${prev.label}.`;
};

const AdminAnalytics = () => {
  const { data, error, loading } = useApi(() => getAdminAnalytics(6), "admin-analytics");
  const months = data?.months || [];
  const totals = months.reduce(
    (acc, m) => ({ revenue: acc.revenue + m.revenue, enrollments: acc.enrollments + m.enrollments }),
    { revenue: 0, enrollments: 0 }
  );

  return (
    <Section title="Last 6 months">
      {error && (
        <div className="p-4">
          <Notice>{error}</Notice>
        </div>
      )}
      {loading && !data && <Loading label="Loading analytics…" />}
      {months.length > 0 && (
        <>
          <p className="px-4 pt-4 text-sm text-ink-text">
            {comparison(months)}{" "}
            <span className="text-ink-muted">
              {formatINR(totals.revenue)} and {totals.enrollments} new{" "}
              {totals.enrollments === 1 ? "enrollment" : "enrollments"} over six months.
            </span>
          </p>
          <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <figure>
              <figcaption className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                <span className="font-medium text-ink-text">Fees received</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-ink" aria-hidden="true" /> Online
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-[2px] border border-ink bg-[repeating-linear-gradient(45deg,var(--color-ink)_0_1.5px,transparent_1.5px_4px)]"
                    aria-hidden="true"
                  />
                  Offline
                </span>
              </figcaption>
              <RevenueChart months={months} />
              <div className="mt-1 grid text-center text-xs" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
                {months.map((m) => (
                  <span key={m.month} className="text-ink-muted tabular-nums">
                    +{m.enrollments}
                  </span>
                ))}
              </div>
              <p className="mt-0.5 text-center text-xs text-ink-muted">New enrollments per month</p>
            </figure>
            <figure>
              <figcaption className="mb-2 text-xs font-medium text-ink-text">Attendance rate</figcaption>
              <AttendanceChart months={months} />
            </figure>
          </div>

          {/* Same numbers for screen readers */}
          <table className="sr-only">
            <caption>Monthly fees, enrollments and attendance</caption>
            <thead>
              <tr>
                <th>Month</th>
                <th>Fees received</th>
                <th>Online</th>
                <th>Offline</th>
                <th>New enrollments</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <td>{m.label}</td>
                  <td>{formatINR(m.revenue)}</td>
                  <td>{formatINR(m.online)}</td>
                  <td>{formatINR(m.offline)}</td>
                  <td>{m.enrollments}</td>
                  <td>{m.attendanceRate === null ? "Not marked" : `${m.attendanceRate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Section>
  );
};

export default AdminAnalytics;
