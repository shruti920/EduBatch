import api from "./axios";

// Fired after the feed marks notices as read, so the sidebar badge refreshes
export const NOTICES_SEEN_EVENT = "edubatch-notices-seen";

// Scoped by role on the server. Params: batch ("all" | "everyone" | id), before (cursor), limit
export const getNotices = async (params = {}) => (await api.get("/notices", { params })).data.data;

export const getUnreadNoticeCount = async () => (await api.get("/notices/unread-count")).data.data.count;

export const markNoticesSeen = async () => (await api.post("/notices/seen")).data;

// Admin: batch null = everyone. Teacher: must be one of their batches.
export const createNotice = async (payload) => (await api.post("/notices", payload)).data.data.notice;

export const updateNotice = async (id, payload) => (await api.patch(`/notices/${id}`, payload)).data.data.notice;

export const deleteNotice = async (id) => (await api.delete(`/notices/${id}`)).data.data;
