import api from "./axios";

export const getAdminDashboard = async () => (await api.get("/dashboard/admin")).data.data;

export const getTeacherDashboard = async () => (await api.get("/dashboard/teacher")).data.data;

export const getStudentDashboard = async () => (await api.get("/dashboard/student")).data.data;

export const getAdminAnalytics = async (months = 6) =>
  (await api.get("/dashboard/admin/analytics", { params: { months } })).data.data;
