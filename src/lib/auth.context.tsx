import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  registerUserFn,
  loginUserFn,
  getCurrentUserFn,
  logoutUserFn,
  logUserActionFn,
  type UserProfile,
} from "./auth.functions";

interface AuthContextType {
  user: UserProfile | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ ok: boolean; message?: string }>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logAction: (activityType: string, activityDescription: string, moduleName: string, metadata?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "piq_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const registerFn = useServerFn(registerUserFn);
  const loginFn = useServerFn(loginUserFn);
  const getCurrentUserServerFn = useServerFn(getCurrentUserFn);
  const logoutFn = useServerFn(logoutUserFn);
  const logActionServerFn = useServerFn(logUserActionFn);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window === "undefined") return;
        const storedToken = localStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          setSessionToken(storedToken);
          const res = await getCurrentUserServerFn({ data: { sessionToken: storedToken } });
          if (res.ok && res.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setSessionToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe = true) => {
    try {
      const res = await loginFn({
        data: { email, password, rememberMe },
      });

      if (res.ok && res.user && res.sessionToken) {
        setUser(res.user);
        setSessionToken(res.sessionToken);
        localStorage.setItem(TOKEN_KEY, res.sessionToken);
        return { ok: true };
      }
      return { ok: false, message: res.message || "Invalid credentials." };
    } catch (err: any) {
      return { ok: false, message: err.message || "Login failed." };
    }
  };

  const register = async (fullName: string, email: string, password: string, confirmPassword: string) => {
    try {
      const res = await registerFn({
        data: { fullName, email, password, confirmPassword },
      });

      if (res.ok && res.user && res.sessionToken) {
        setUser(res.user);
        setSessionToken(res.sessionToken);
        localStorage.setItem(TOKEN_KEY, res.sessionToken);
        return { ok: true };
      }
      return { ok: false, message: res.message || "Registration failed." };
    } catch (err: any) {
      return { ok: false, message: err.message || "Registration failed." };
    }
  };

  const logout = async () => {
    try {
      if (sessionToken) {
        await logoutFn({ data: { sessionToken } });
      }
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setSessionToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    if (!sessionToken) return;
    try {
      const res = await getCurrentUserServerFn({ data: { sessionToken } });
      if (res.ok && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const logAction = async (activityType: string, activityDescription: string, moduleName: string, metadata?: any) => {
    try {
      await logActionServerFn({
        data: {
          sessionToken: sessionToken || undefined,
          activityType,
          activityDescription,
          moduleName,
          metadata,
        },
      });
    } catch (e) {
      console.error("Failed to log user action:", e);
    }
  };

  const isAuthenticated = Boolean(user && sessionToken);
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
        logAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
