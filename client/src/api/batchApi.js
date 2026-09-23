import api from "./axios";

/**
 * Fetch all batches with optional query filters (status, search, subject)
 */
export const getBatches = async (params = {}) => {
  const response = await api.get("/batches", { params });
  return response.data.data;
};

/**
 * Fetch single batch details by ID
 */
export const getBatchById = async (id) => {
  const response = await api.get(`/batches/${id}`);
  return response.data.data.batch;
};

/**
 * Create a new academic batch (Admin only)
 */
export const createBatch = async (batchData) => {
  const response = await api.post("/batches", batchData);
  return response.data.data.batch;
};

/**
 * Update an existing batch (Admin only)
 */
export const updateBatch = async (id, batchData) => {
  const response = await api.put(`/batches/${id}`, batchData);
  return response.data.data.batch;
};

/**
 * Quick status update (upcoming | active | archived) (Admin only)
 */
export const updateBatchStatus = async (id, status) => {
  const response = await api.patch(`/batches/${id}/status`, { status });
  return response.data.data.batch;
};

/**
 * Soft-archive a batch (Admin only)
 */
export const archiveBatch = async (id) => {
  const response = await api.delete(`/batches/${id}`);
  return response.data.data;
};

/**
 * Get active faculty list for Admin dropdown selection
 */
export const getFacultyList = async () => {
  const response = await api.get("/batches/meta/faculty");
  return response.data.data.teachers;
};
