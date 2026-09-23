/* eslint-disable react-refresh/only-export-components -- provider and hook live together on purpose */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { TOKEN_KEY, USER_KEY } from "../api/axios";

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
};

export const homePathFor = (role) =>
  role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";

// Pages each role may open. Used to decide where to send someone after login.
const ROLE_PATHS = {
  admin: ["/admin", "/enrollments", "/attendance", "/payments", "/notices"],
  teacher: ["/teacher", "/enrollments", "/attendance", "/notices"],
  student: ["/student", "/attendance", "/payments", "/notices"],
};

// Return to the page that asked for login — but only if this role can open it
export const postLoginPath = (role, fromPath) => {
  const allowed = ROLE_PATHS[role] || [];
  if (fromPath && allowed.some((p) => fromPath === p || fromPath.startsWith(`${p}/`))) {
    return fromPath;
  }
  return homePathFor(role);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  // Only block the UI on first load if there is a stored session to verify
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const saveSession = (nextUser, nextToken) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener("edubatch-logout", logout);
    return () => window.removeEventListener("edubatch-logout", logout);
  }, [logout]);

  // Re-validate a stored session once on load
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api
      .get("/auth/me")
      .then((res) => {
        const freshUser = res.data.data.user;
        setUser(freshUser);
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      })
      .catch((err) => {
        // 401s are already handled by the axios interceptor. If the API is just
        // unreachable, keep the stored session instead of logging the user out.
        if (err.response?.status === 403) logout();
      })
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const { user: nextUser, token: nextToken } = res.data.data;
      saveSession(nextUser, nextToken);
      return nextUser;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Couldn't log in. Check your email and password.", {
        cause: error,
      });
    }
  };

  const register = async (payload) => {
    try {
      const res = await api.post("/auth/register", payload);
      const { user: nextUser, token: nextToken } = res.data.data;
      saveSession(nextUser, nextToken);
      return nextUser;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Couldn't create the account. Try again.", {
        cause: error,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, isAuthenticated: Boolean(token && user), login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
