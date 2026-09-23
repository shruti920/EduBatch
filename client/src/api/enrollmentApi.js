import api from "./axios";

export const enrollStudent = async (payload) => (await api.post("/enrollments", payload)).data.data.enrollment;

export const getMyEnrollments = async () => (await api.get("/enrollments/my")).data.data.enrollments;

// Admin, or the batch's own teacher
export const getBatchRoster = async (batchId) => (await api.get(`/enrollments/batch/${batchId}`)).data.data;

// Admin only
export const getAllEnrollments = async (params = {}) => (await api.get("/enrollments", { params })).data.data;

export const updateEnrollmentStatus = async (id, payload) =>
  (await api.patch(`/enrollments/${id}/status`, payload)).data.data.enrollment;

export const dropStudent = async (id) => (await api.delete(`/enrollments/${id}`)).data.data;

export const getStudentOptions = async () => (await api.get("/enrollments/students")).data.data.students;
