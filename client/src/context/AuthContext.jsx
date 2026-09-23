import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("edubatch_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("edubatch_token") || null);
  const [loading, setLoading] = useState(true);

  // Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem("edubatch_token");
    localStorage.removeItem("edubatch_user");
    setToken(null);
    setUser(null);
  }, []);

  // Listen to cross-component / axios logout events
  useEffect(() => {
    const handleForceLogout = () => {
      logout();
    };
    window.addEventListener("edubatch-logout", handleForceLogout);
    return () => window.removeEventListener("edubatch-logout", handleForceLogout);
  }, [logout]);

  // Check auth and hydrate user on mount
  useEffect(() => {
    const hydrateUser = async () => {
      const storedToken = localStorage.getItem("edubatch_token");
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        if (response.data.success && response.data.data.user) {
          const freshUser = response.data.data.user;
          setUser(freshUser);
          localStorage.setItem("edubatch_user", JSON.stringify(freshUser));
        } else {
          logout();
        }
      } catch (err) {
        console.error("Session revalidation failed:", err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    hydrateUser();
  }, [logout]);

  // Login action
  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { user: loggedInUser, token: receivedToken } = response.data.data;

      localStorage.setItem("edubatch_token", receivedToken);
      localStorage.setItem("edubatch_user", JSON.stringify(loggedInUser));

      setToken(receivedToken);
      setUser(loggedInUser);

      return { success: true, user: loggedInUser };
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to log in. Please check your credentials.";
      throw new Error(message);
    }
  };

  // Register action
  const register = async (userData) => {
    try {
      const response = await api.post("/auth/register", userData);
      const { user: registeredUser, token: receivedToken } = response.data.data;

      localStorage.setItem("edubatch_token", receivedToken);
      localStorage.setItem("edubatch_user", JSON.stringify(registeredUser));

      setToken(receivedToken);
      setUser(registeredUser);

      return { success: true, user: registeredUser };
    } catch (error) {
      const message =
        error.response?.data?.message || "Registration failed. Please check your input.";
      throw new Error(message);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
