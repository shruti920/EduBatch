import api from "./axios";

export const updateProfile = async (payload) => (await api.patch("/auth/me", payload)).data.data.user;

// Returns { user, token } — the server starts a fresh session for this device
export const changePassword = async (payload) => (await api.patch("/auth/change-password", payload)).data.data;

export const requestPasswordReset = async (email) => (await api.post("/auth/forgot-password", { email })).data.message;

export const resetPassword = async (token, password) =>
  (await api.post("/auth/reset-password", { token, password })).data.message;

export const logoutAllDevices = async () => (await api.post("/auth/logout-all")).data.message;
