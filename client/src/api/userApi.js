import api from "./axios";

export const getUsers = async (params = {}) => (await api.get("/users", { params })).data.data;

export const createUser = async (payload) => (await api.post("/users", payload)).data;

export const setUserStatus = async (id, isActive) => (await api.patch(`/users/${id}/status`, { isActive })).data;
