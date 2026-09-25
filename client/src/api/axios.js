import axios from "axios";


let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token || null;
};
export const getAccessToken = () => accessToken;

// Legacy keys from the old localStorage session; removed on load
const LEGACY_KEYS = ["edubatch_token", "edubatch_user"];
try {
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
} catch {
  /* storage unavailable */
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});


let refreshing = null;
export const refreshSession = () => {
  if (!refreshing) {
    refreshing = api
    
      .post("/auth/refresh", {}, { skipAuthRefresh: true, timeout: 75000 })
      .then((res) => {
        setAccessToken(res.data.data.token);
        return res.data.data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

const NO_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const url = original.url || "";
    const status = error.response?.status;

    if (status === 401 && !original._retried && !original.skipAuthRefresh && !NO_REFRESH.some((p) => url.includes(p))) {
      original._retried = true;
      try {
        await refreshSession();
        original.headers = { ...original.headers, Authorization: `Bearer ${accessToken}` };
        return api(original);
      } catch {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent("edubatch-logout", { detail: { reason: "expired" } }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;