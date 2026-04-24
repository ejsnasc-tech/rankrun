import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";

type Role = "admin" | "corredor" | "operador";

export function ProtectedRoute({ children, role }: { children: ReactNode; role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  const isAdminArea = location.pathname.startsWith("/admin");
  const loginPath = isAdminArea ? "/admin/login" : "/login";

  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === "corredor") {
      return <Navigate to="/app/minhas-provas" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
