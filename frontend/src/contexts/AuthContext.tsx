import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../services/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: "corredor" | "operador";
  medicalInfo?: {
    allergies?: string;
    conditions?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  } | null;
};

type AuthContextData = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    birthDate?: string;
    document?: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => void;
  refreshMe: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async (): Promise<User | null> => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const { data } = await api.get<User>("/auth/me");
      setUser(data);
      return data;
    } catch {
      localStorage.removeItem("token");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshMe();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await api.post<{ token: string }>("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    const me = await refreshMe();
    if (!me) {
      throw new Error("Falha ao obter perfil após login.");
    }
    return me;
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    birthDate?: string;
    document?: string;
    phone?: string;
  }): Promise<User> => {
    await api.post("/auth/register", data);
    return login(data.email, data.password);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshMe }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
