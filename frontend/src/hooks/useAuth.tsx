import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import client, { getErrorMessage } from "../api/client";
import type { AuthResponse, User } from "../types";

interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  business_name: string;
  phone?: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "tradeagent_token";
const USER_KEY = "tradeagent_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem(USER_KEY);
    return cached ? (JSON.parse(cached) as User) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    client
      .get<User>("/api/auth/me")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const persistAuth = (data: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = useCallback(async (payload: LoginPayload) => {
    try {
      const res = await client.post<AuthResponse>("/api/auth/login", payload);
      persistAuth(res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    try {
      const res = await client.post<AuthResponse>("/api/auth/register", payload);
      persistAuth(res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const googleLogin = useCallback(async (idToken: string) => {
    try {
      const res = await client.post<AuthResponse>("/api/auth/google", { id_token: idToken });
      persistAuth(res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      googleLogin,
      logout,
      updateUser,
    }),
    [user, isLoading, login, register, googleLogin, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
