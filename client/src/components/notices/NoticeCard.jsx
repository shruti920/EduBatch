import { Pin } from "lucide-react";
import { Pill } from "../ui";
import { formatDate, timeAgo } from "../../utils/format";

const ROLE_LABEL = { admin: "Admin", teacher: "Teacher" };

/**
 * One notice. The message is rendered as plain text (React escapes it) with
 * line breaks kept — never as HTML.
 */
const NoticeCard = ({ notice, canManage, onEdit, onDelete, compact = false }) => {
  const expired = notice.expiresAt && new Date(notice.expiresAt) <= new Date();
  const edited = new Date(notice.updatedAt) - new Date(notice.createdAt) > 60_000;

  return (
    <article
      className={`rounded-md border bg-white ${
        notice.pinned ? "border-marigold-border shadow-[inset_3px_0_0_var(--color-marigold)]" : "border-paper-border"
      } ${expired ? "opacity-70" : ""}`}
    >
      <div className={compact ? "p-3" : "p-4"}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Pill tone={notice.batch ? "neutral" : "marigold"}>{notice.batch ? notice.batch.name : "Everyone"}</Pill>
          {notice.pinned && (
            <span className="inline-flex items-center gap-1 font-medium text-marigold-dark">
              <Pin size={12} aria-hidden="true" /> Pinned
            </span>
          )}
          {expired && <Pill tone="neutral">Expired · hidden from students</Pill>}
        </div>

        <h3 className={`mt-2 font-semibold text-ink ${compact ? "text-sm" : "text-base"}`}>{notice.title}</h3>
        <p
          className={`mt-1 break-words whitespace-pre-line text-ink-text ${compact ? "line-clamp-3 text-sm" : "text-sm leading-relaxed"}`}
        >
          {notice.body}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <p>
            {notice.createdBy?.name || "Someone"}
            {notice.createdBy?.role && ` · ${ROLE_LABEL[notice.createdBy.role] || notice.createdBy.role}`}
            {" · "}
            <time dateTime={notice.createdAt} title={new Date(notice.createdAt).toLocaleString("en-IN")}>
              {timeAgo(notice.createdAt)}
            </time>
            {edited && " · edited"}
            {notice.expiresAt && !expired && ` · shown until ${formatDate(notice.expiresAt)}`}
          </p>
          {canManage && !compact && (
            <div className="flex gap-3 text-sm">
              <button type="button" onClick={() => onEdit(notice)} className="text-ink underline underline-offset-2">
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(notice)}
                className="text-attention underline underline-offset-2"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default NoticeCard;
