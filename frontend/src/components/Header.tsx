import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type HeaderProps = {
  area: "public" | "runner" | "admin";
};

const labels = {
  public: "Área pública",
  runner: "Área do corredor",
  admin: "Área da empresa",
};

type NavItem = { to: string; label: string; end?: boolean };

const runnerNav: NavItem[] = [
  { to: "/app", label: "Painel", end: true },
  { to: "/app/resultados", label: "Meus resultados" },
  { to: "/app/minhas-provas", label: "Minhas inscrições" },
  { to: "/app/perfil", label: "Perfil" },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/eventos", label: "Eventos" },
  { to: "/admin/relatorios", label: "Relatórios" },
];

export function Header({ area }: HeaderProps) {
  const { user, logout } = useAuth();
  const isAdminArea = area === "admin";

  const wrapperClass = isAdminArea
    ? "border-b border-slate-700 bg-slate-900 text-slate-100"
    : "border-b bg-white text-gray-700";
  const logoClass = isAdminArea ? "font-semibold text-orange-400" : "font-semibold text-orange-500";
  const labelClass = isAdminArea ? "text-slate-400" : "text-gray-500";
  const btnLogout = isAdminArea
    ? "rounded bg-slate-700 px-3 py-1 text-slate-100 hover:bg-slate-600"
    : "rounded bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300";
  const btnLogin = isAdminArea
    ? "rounded bg-orange-400 px-3 py-1 text-slate-900 hover:bg-orange-300"
    : "rounded bg-orange-500 px-3 py-1 text-white hover:bg-orange-600";

  const navItems = area === "runner" ? runnerNav : area === "admin" ? adminNav : [];

  const navLinkClass = (active: boolean) => {
    if (isAdminArea) {
      return active ? "text-orange-400 font-medium" : "text-slate-300 hover:text-white";
    }
    return active ? "text-orange-600 font-medium" : "text-gray-600 hover:text-gray-900";
  };

  return (
    <header className={wrapperClass}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to={isAdminArea ? "/admin" : "/"} className={logoClass}>
            corridasderua{isAdminArea ? " · empresa" : ""}
          </Link>
          {navItems.length > 0 ? (
            <nav className="flex items-center gap-4 text-sm">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className={labelClass}>{labels[area]}</span>
          {user ? (
            <>
              <span>{user.name}</span>
              <button onClick={logout} className={btnLogout}>
                Sair
              </button>
            </>
          ) : (
            <>
              {area === "public" ? (
                <Link to="/admin/login" className="text-xs text-gray-500 hover:text-gray-700">
                  Acesso da empresa
                </Link>
              ) : null}
              <Link to={isAdminArea ? "/admin/login" : "/login"} className={btnLogin}>
                Entrar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
