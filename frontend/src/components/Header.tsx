import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type HeaderProps = {
  area: "public" | "runner";
};

const labels = {
  public: "Área pública",
  runner: "Área do corredor",
};

type NavItem = { to: string; label: string; end?: boolean };

const runnerNav: NavItem[] = [
  { to: "/app", label: "Painel", end: true },
  { to: "/app/resultados", label: "Meus resultados" },
  { to: "/app/minhas-provas", label: "Minhas inscrições" },
  { to: "/app/perfil", label: "Perfil" },
];

const publicNav: NavItem[] = [
  { to: "/eventos", label: "Corridas" },
  { to: "/atletas", label: "Atletas" },
];

export function Header({ area }: HeaderProps) {
  const { user, logout } = useAuth();

  const navItems = area === "runner" ? runnerNav : publicNav;

  const navLinkClass = (active: boolean) =>
    active ? "text-orange-600 font-medium" : "text-gray-600 hover:text-gray-900";

  return (
    <header className="border-b bg-white text-gray-700">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-semibold text-orange-500">
            corridasderua
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
          <span className="text-gray-500">{labels[area]}</span>
          {user ? (
            <>
              <span>{user.name}</span>
              <button
                onClick={logout}
                className="rounded bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300"
              >
                Sair
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded bg-orange-500 px-3 py-1 text-white hover:bg-orange-600"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
