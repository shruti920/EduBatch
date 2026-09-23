import api from "./axios";

/**
 * Fetch genuine MongoDB aggregate metrics for Admin Institutional Overview
 */
export const getAdminDashboard = async () => {
  const response = await api.get("/dashboard/admin");
  return response.data.data;
};

/**
 * Fetch genuine metrics for Teacher Faculty Desk
 */
export const getTeacherDashboard = async () => {
  const response = await api.get("/dashboard/teacher");
  return response.data.data;
};

/**
 * Fetch genuine metrics for Student Candidate Desk
 */
export const getStudentDashboard = async () => {
  const response = await api.get("/dashboard/student");
  return response.data.data;
};
