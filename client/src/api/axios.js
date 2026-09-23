import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("edubatch_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute =
        error.config.url?.includes("/auth/login") ||
        error.config.url?.includes("/auth/register");

      if (!isAuthRoute) {
        localStorage.removeItem("edubatch_token");
        localStorage.removeItem("edubatch_user");
        window.dispatchEvent(new Event("edubatch-logout"));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
