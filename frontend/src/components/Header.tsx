import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type HeaderProps = {
  area: "public" | "runner" | "admin";
};

const labels = {
  public: "Área pública",
  runner: "Área do corredor",
  admin: "Área da empresa",
};

export function Header({ area }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-semibold text-orange-500">
          corridasderua
        </Link>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{labels[area]}</span>
          {user ? (
            <>
              <span>{user.name}</span>
              <button onClick={logout} className="rounded bg-gray-200 px-3 py-1 text-gray-700">
                Sair
              </button>
            </>
          ) : (
            <Link to="/login" className="rounded bg-orange-500 px-3 py-1 text-white">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
