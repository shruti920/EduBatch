import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import NoticeCard from "../../components/notices/NoticeCard";
import NoticeForm from "../../components/notices/NoticeForm";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Loading,
  Notice,
  PageHeader,
  Section,
  inputClass,
} from "../../components/ui";
import { NOTICES_SEEN_EVENT, deleteNotice, getNotices, markNoticesSeen } from "../../api/noticeApi";
import { getBatches } from "../../api/batchApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useApi } from "../../hooks/useApi";
import { errorMessage } from "../../utils/format";

/**
 * The feed for one filter. Remounted (via key) when the filter changes, so the
 * "load more" pages always belong to the current filter.
 */
const Feed = ({ filter, reloadKey, isStaff, canManage, onEdit, onDelete }) => {
  const params = { batch: filter };
  const first = useApi(() => getNotices(params), `notices-${filter}-${reloadKey}`);
  const [more, setMore] = useState({ items: [], cursor: undefined });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");

  // Opening the feed marks everything as read (clears the sidebar badge)
  useEffect(() => {
    if (!first.data) return;
    markNoticesSeen()
      .then(() => window.dispatchEvent(new Event(NOTICES_SEEN_EVENT)))
      .catch(() => {});
  }, [first.data]);

  if (first.loading && !first.data) return <Loading />;
  if (first.error)
    return (
      <div className="p-4">
        <Notice>{first.error}</Notice>
      </div>
    );

  const notices = [...first.data.notices, ...more.items];
  const cursor = more.cursor === undefined ? first.data.nextCursor : more.cursor;

  const loadMore = async () => {
    setLoadingMore(true);
    setMoreError("");
    try {
      const page = await getNotices({ ...params, before: cursor });
      setMore((prev) => ({ items: [...prev.items, ...page.notices], cursor: page.nextCursor }));
    } catch (err) {
      setMoreError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  if (notices.length === 0) {
    return (
      <EmptyState title="No notices yet">
        {isStaff
          ? "Post a notice to share updates with your students."
          : "Updates from your institute will appear here."}
      </EmptyState>
    );
  }

  return (
    <div className={`space-y-3 p-4 ${first.loading ? "opacity-60" : ""}`}>
      {notices.map((n) => (
        <NoticeCard key={n._id} notice={n} canManage={canManage(n)} onEdit={onEdit} onDelete={onDelete} />
      ))}
      {moreError && <Notice>{moreError}</Notice>}
      {cursor && (
        <div className="pt-2 text-center">
          <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load older notices"}
          </Button>
        </div>
      )}
    </div>
  );
};

const Notices = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === "admin";
  const isStaff = isAdmin || user?.role === "teacher";

  // Batches this user can post to / filter by (students don't need the list)
  const batches = useApi(
    () => (isStaff ? getBatches({ status: "all" }) : Promise.resolve({ batches: [] })),
    "notice-batches",
  );
  const batchList = (batches.data?.batches || []).filter((b) => b.status !== "archived");

  const [filter, setFilter] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  // ?compose=1&batch=<id> opens the form (used by the teacher dashboard)
  const [form, setForm] = useState(() =>
    searchParams.get("compose") ? { notice: null, initialBatch: searchParams.get("batch") || "" } : null,
  );
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = (n) => isAdmin || n.createdBy?._id === user?._id;

  const closeForm = () => {
    setForm(null);
    if (searchParams.get("compose")) setSearchParams({}, { replace: true });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteNotice(toDelete._id);
      toast.success("Notice deleted.");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const noBatchesToPost = user?.role === "teacher" && batches.data && batchList.length === 0;

  return (
    <DashboardLayout>
      <PageHeader
        title="Notices"
        description={
          isAdmin
            ? "Announcements for everyone or for a single batch."
            : isStaff
              ? "Announcements for your batches and from the institute."
              : "Announcements from your institute and your teachers."
        }
        actions={
          isStaff && (
            <Button
              onClick={() => setForm({ notice: null, initialBatch: "" })}
              disabled={!batches.data || noBatchesToPost}
            >
              <Plus size={16} aria-hidden="true" /> Post notice
            </Button>
          )
        }
      />

      {noBatchesToPost && <Notice>You can post notices once an admin assigns you to a batch.</Notice>}

      <Section
        title="All notices"
        aside={
          isStaff && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter notices"
              className={`${inputClass} sm:w-60`}
            >
              <option value="all">All notices</option>
              <option value="everyone">For everyone</option>
              {batchList.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          )
        }
      >
        <Feed
          key={`${filter}-${reloadKey}`}
          filter={filter}
          reloadKey={reloadKey}
          isStaff={isStaff}
          canManage={canManage}
          onEdit={(notice) => setForm({ notice })}
          onDelete={setToDelete}
        />
      </Section>

      <NoticeForm
        open={Boolean(form)}
        notice={form?.notice}
        initialBatch={form?.initialBatch}
        batches={batchList}
        allowEveryone={isAdmin}
        onClose={closeForm}
        onSaved={(message) => {
          closeForm();
          toast.success(message);
          setReloadKey((k) => k + 1);
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this notice?"
        confirmLabel="Delete notice"
        tone="danger"
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        <p>
          <strong>{toDelete?.title}</strong> will be removed for everyone who can see it. This can't be undone.
        </p>
      </ConfirmDialog>
    </DashboardLayout>
  );
};

export default Notices;
