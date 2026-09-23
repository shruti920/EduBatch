import { BatchStatusPill } from "../ui";
import { formatDate, formatSchedule } from "../../utils/format";

/**
 * Read-only summary of a batch, used on the teacher and student dashboards.
 * `badges` renders next to the status pill; `children` renders as the card footer.
 */
const BatchCard = ({ batch, badges, details = [], children }) => (
  <article className="flex flex-col rounded-md border border-paper-border bg-white">
    <div className="flex-1 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <BatchStatusPill status={batch.status} />
        {badges}
      </div>
      <h3 className="mt-2 text-lg font-semibold text-ink">{batch.name}</h3>
      <p className="text-sm text-ink-muted">{batch.subject}</p>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-ink-muted">Classes</dt>
          <dd>{formatSchedule(batch.schedule)}</dd>
        </div>
        {batch.schedule?.venue && (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-ink-muted">Room</dt>
            <dd>{batch.schedule.venue}</dd>
          </div>
        )}
        {(batch.startDate || batch.endDate) && (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-ink-muted">Runs</dt>
            <dd>
              {formatDate(batch.startDate)} – {formatDate(batch.endDate)}
            </dd>
          </div>
        )}
        {details.map((d) => (
          <div key={d.label} className="flex gap-2">
            <dt className="w-20 shrink-0 text-ink-muted">{d.label}</dt>
            <dd>{d.value}</dd>
          </div>
        ))}
      </dl>
    </div>
    {children && (
      <div className="flex flex-wrap gap-4 border-t border-paper-border px-4 py-3 text-sm">{children}</div>
    )}
  </article>
);

export default BatchCard;
