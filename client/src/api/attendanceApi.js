import api from "./axios";

/**
 * Record or revise a whole-class attendance register (Admin or assigned Teacher)
 */
export const markAttendance = async (data) => {
  const response = await api.post("/attendance", data);
  return response.data.data.attendance;
};

/**
 * Fetch attendance sessions history for a specific batch (Admin or assigned Teacher)
 */
export const getBatchAttendance = async (batchId, params = {}) => {
  const response = await api.get(`/attendance/batch/${batchId}`, { params });
  return response.data.data;
};

/**
 * Check if attendance is marked for a specific batch and date (Admin or assigned Teacher)
 */
export const getBatchAttendanceByDate = async (batchId, date) => {
  const response = await api.get(`/attendance/batch/${batchId}/date/${date}`);
  return response.data.data;
};

/**
 * Fetch candidate's personal attendance metrics and session logs (Student only)
 */
export const getMyAttendance = async () => {
  const response = await api.get("/attendance/my");
  return response.data.data;
};
