import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute({ children, role }: { children: ReactNode; role?: "admin" | "corredor" | "operador" }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
