import api from "./axios";

// Admin: all batches (filter by status/search/subject). Teacher: own. Student: enrolled.
export const getBatches = async (params = {}) => (await api.get("/batches", { params })).data.data;

export const getBatchById = async (id) => (await api.get(`/batches/${id}`)).data.data.batch;

export const createBatch = async (payload) => (await api.post("/batches", payload)).data.data.batch;

export const updateBatch = async (id, payload) => (await api.put(`/batches/${id}`, payload)).data.data.batch;

export const updateBatchStatus = async (id, status) =>
  (await api.patch(`/batches/${id}/status`, { status })).data.data.batch;

export const archiveBatch = async (id) => (await api.delete(`/batches/${id}`)).data.data;

export const getTeacherOptions = async () => (await api.get("/batches/meta/teachers")).data.data.teachers;
