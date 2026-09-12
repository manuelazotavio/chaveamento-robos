import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TOKEN_STORAGE_KEY } from "@/services/api";
import { authService } from "@/services/authService";
import { decodeJwtPayload, isJwtExpired } from "@/lib/jwt";
import type { AuthUser, LoginRequest, Role } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function usuarioDoToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload<{ sub?: string; role?: Role }>(token);
  if (!payload?.sub || !payload?.role) return null;
  return { email: payload.sub, role: payload.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && !isJwtExpired(token)) {
      setUser(usuarioDoToken(token));
    } else if (token) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    window.addEventListener("auth:unauthorized", logout);
    return () => window.removeEventListener("auth:unauthorized", logout);
  }, [logout]);

  const login = useCallback(async (payload: LoginRequest) => {
    const { token } = await authService.login(payload);
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setUser(usuarioDoToken(token));
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, login, logout }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de um AuthProvider");
  return ctx;
}
