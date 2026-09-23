import api from "./axios";

// Admin, or the batch's own teacher. Re-submitting a date updates that day.
export const markAttendance = async (payload) => (await api.post("/attendance", payload)).data.data.attendance;

export const getBatchAttendance = async (batchId, params = {}) =>
  (await api.get(`/attendance/batch/${batchId}`, { params })).data.data;

export const getBatchAttendanceByDate = async (batchId, date) =>
  (await api.get(`/attendance/batch/${batchId}/date/${date}`)).data.data;

// Student only
export const getMyAttendance = async () => (await api.get("/attendance/my")).data.data;
