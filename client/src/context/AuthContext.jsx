/* eslint-disable react-refresh/only-export-components -- provider and hook live together on purpose */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { refreshSession, setAccessToken } from "../api/axios";

const AuthContext = createContext(null);

export const homePathFor = (role) =>
  role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";

// Pages each role may open. Used to decide where to send someone after login.
const ROLE_PATHS = {
  admin: ["/admin", "/enrollments", "/attendance", "/payments", "/notices", "/profile"],
  teacher: ["/teacher", "/enrollments", "/attendance", "/notices", "/profile"],
  student: ["/student", "/attendance", "/payments", "/notices", "/profile"],
};

// Return to the page that asked for login — but only if this role can open it
export const postLoginPath = (role, fromPath) => {
  const allowed = ROLE_PATHS[role] || [];
  if (fromPath && allowed.some((p) => fromPath === p || fromPath.startsWith(`${p}/`))) {
    return fromPath;
  }
  return homePathFor(role);
};

// No response at all means the API couldn't be reached — say that, not "wrong password"
const messageFrom = (error, fallback) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (!error.response) {
    return error.code === "ECONNABORTED"
      ? "The server took too long to answer. It may be waking up; try again in a moment."
      : "Can't reach the server. Check your connection and try again.";
  }
  return fallback;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Blocks protected routes until we know whether the refresh cookie holds a session
  const [loading, setLoading] = useState(true);

  // A session starts: token in memory, user in state
  const applySession = useCallback(({ user: nextUser, token }) => {
    setAccessToken(token);
    setUser(nextUser);
    return nextUser;
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  // Restore the session on page load from the httpOnly refresh cookie
  useEffect(() => {
    let active = true;
    refreshSession()
      .then((data) => active && setUser(data.user))
      .catch(() => active && clearSession())
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [clearSession]);

  // The axios interceptor fires this when a refresh fails mid-session
  useEffect(() => {
    window.addEventListener("edubatch-logout", clearSession);
    return () => window.removeEventListener("edubatch-logout", clearSession);
  }, [clearSession]);

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      return applySession(res.data.data);
    } catch (error) {
      throw new Error(messageFrom(error, "Couldn't log in. Check your email and password."), { cause: error });
    }
  };

  const register = async (payload) => {
    try {
      const res = await api.post("/auth/register", payload);
      return applySession(res.data.data);
    } catch (error) {
      throw new Error(messageFrom(error, "Couldn't create the account. Try again."), { cause: error });
    }
  };

  // Revokes the refresh token on the server; the local session ends either way
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* offline or already logged out: still clear locally */
    }
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        applySession,
        clearSession,
        updateUser: setUser,
      }}
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
