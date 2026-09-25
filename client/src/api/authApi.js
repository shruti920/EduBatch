import api from "./axios";

export const updateProfile = async (payload) => (await api.patch("/auth/me", payload)).data.data.user;

// Returns { user, token } — the server starts a fresh session for this device
export const changePassword = async (payload) => (await api.patch("/auth/change-password", payload)).data.data;

export const requestPasswordReset = async (email) => (await api.post("/auth/forgot-password", { email })).data.message;

export const resetPassword = async (token, password) =>
  (await api.post("/auth/reset-password", { token, password })).data.message;

export const logoutAllDevices = async () => (await api.post("/auth/logout-all")).data.message;

// Sends the cropped image bytes as-is; the server checks the type from the bytes
export const uploadAvatar = async (blob) =>
  (await api.put("/auth/me/avatar", blob, { headers: { "Content-Type": blob.type || "application/octet-stream" }, timeout: 30000 }))
    .data.data.user;

export const removeAvatar = async () => (await api.delete("/auth/me/avatar")).data.data.user;
