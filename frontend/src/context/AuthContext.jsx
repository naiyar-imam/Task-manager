import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { fetchCurrentUser, loginUser, registerUser } from "../api/auth";
import { clearStoredAuth, getStoredAuth, setStoredAuth } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => getStoredAuth());
  const [user, setUser] = useState(() => getStoredAuth()?.user ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();

    const initializeAuth = async () => {
      if (!stored?.access) {
        setLoading(false);
        return;
      }

      if (stored.user) {
        setUser(stored.user);
      }

      try {
        const currentUser = await fetchCurrentUser();
        const nextState = { ...stored, user: currentUser };
        setStoredAuth(nextState);
        setAuthState(nextState);
        setUser(currentUser);
      } catch (error) {
        clearStoredAuth();
        setAuthState(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    const handleLogout = () => {
      setAuthState(null);
      setUser(null);
      setLoading(false);
    };

    window.addEventListener("auth:logout", handleLogout);
    initializeAuth();

    return () => {
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, []);

  const saveSession = (payload) => {
    setStoredAuth(payload);
    setAuthState(payload);
    setUser(payload.user);
  };

  const login = async (credentials) => {
    const session = await loginUser(credentials);
    saveSession(session);
    return session;
  };

  const register = async (payload) => {
    const session = await registerUser(payload);
    saveSession(session);
    return session;
  };

  const logout = () => {
    clearStoredAuth();
    setAuthState(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const currentUser = await fetchCurrentUser();
    const stored = getStoredAuth();
    if (stored) {
      const nextState = { ...stored, user: currentUser };
      saveSession(nextState);
    }
    return currentUser;
  };

  const value = useMemo(
    () => ({
      authState,
      user,
      isAuthenticated: Boolean(authState?.access),
      loading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [authState, loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
