import api from "./axios";

/**
 * Enroll a student into a batch (Admin only)
 */
export const enrollStudent = async (data) => {
  const response = await api.post("/enrollments", data);
  return response.data.data.enrollment;
};

/**
 * Fetch candidate's own active enrollments (Student only)
 */
export const getMyEnrollments = async () => {
  const response = await api.get("/enrollments/my");
  return response.data.data.enrollments;
};

/**
 * Fetch full candidate roster for a specific batch (Admin or assigned Teacher)
 */
export const getBatchRoster = async (batchId) => {
  const response = await api.get(`/enrollments/batch/${batchId}`);
  return response.data.data;
};

/**
 * Fetch all enrollments across system with filters (Admin only)
 */
export const getAllEnrollments = async (params = {}) => {
  const response = await api.get("/enrollments", { params });
  return response.data.data;
};

/**
 * Update enrollment status (Admin only)
 */
export const updateEnrollmentStatus = async (id, data) => {
  const response = await api.patch(`/enrollments/${id}/status`, data);
  return response.data.data.enrollment;
};

/**
 * Soft drop candidate from cohort (Admin only)
 */
export const dropStudent = async (id) => {
  const response = await api.delete(`/enrollments/${id}`);
  return response.data.data;
};

/**
 * Fetch active candidates for enrollment dropdown selection
 */
export const getCandidates = async () => {
  const response = await api.get("/enrollments/candidates");
  return response.data.data.students;
};
