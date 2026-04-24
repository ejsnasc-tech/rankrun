import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});

type FormData = z.infer<typeof schema>;

export function AdminLoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    setError(null);
    try {
      const me = await login(values.email, values.password);
      if (me.role !== "admin" && me.role !== "operador") {
        logout();
        setError("Esta conta não tem acesso à área da empresa.");
        return;
      }
      navigate("/admin");
    } catch {
      setError("E-mail ou senha inválidos.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold text-orange-400">
            corridasderua · empresa
          </Link>
          <Link to="/" className="text-sm text-slate-400 hover:text-white">
            ← Voltar para a área pública
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md space-y-4 rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-xl">
          <div>
            <p className="text-xs uppercase tracking-wide text-orange-400">Área da empresa</p>
            <h1 className="text-xl font-semibold">Acesso do organizador</h1>
            <p className="mt-1 text-sm text-slate-400">Entre com suas credenciais administrativas.</p>
          </div>

          <div>
            <input
              {...register("email")}
              placeholder="E-mail corporativo"
              className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-orange-400 focus:outline-none"
            />
            {errors.email ? <p className="text-sm text-red-400">{errors.email.message}</p> : null}
          </div>

          <div>
            <input
              {...register("password")}
              type="password"
              placeholder="Senha"
              className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-orange-400 focus:outline-none"
            />
            {errors.password ? <p className="text-sm text-red-400">{errors.password.message}</p> : null}
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            disabled={isSubmitting}
            className="w-full rounded bg-orange-400 px-3 py-2 font-medium text-slate-900 hover:bg-orange-300 disabled:opacity-50"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>

          <div className="flex items-center justify-between border-t border-slate-700 pt-4 text-sm">
            <span className="text-slate-400">Não é organizador?</span>
            <Link to="/login" className="text-orange-400 hover:underline">
              Acesso do corredor →
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
