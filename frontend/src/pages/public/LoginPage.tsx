import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "../../components/Header";
import { useAuth } from "../../contexts/AuthContext";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
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
      if (me.role !== "corredor") {
        logout();
        setError("Esta área é exclusiva para corredores. Use o acesso da empresa.");
        return;
      }
      navigate("/app/minhas-provas");
    } catch {
      setError("E-mail ou senha inválidos.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="public" />
      <main className="mx-auto max-w-md px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-orange-600">Área do corredor</p>
            <h1 className="text-xl font-semibold">Entrar</h1>
          </div>
          <div>
            <input {...register("email")} placeholder="E-mail" className="w-full rounded border px-3 py-2" />
            {errors.email ? <p className="text-sm text-red-500">{errors.email.message}</p> : null}
          </div>
          <div>
            <input {...register("password")} type="password" placeholder="Senha" className="w-full rounded border px-3 py-2" />
            {errors.password ? <p className="text-sm text-red-500">{errors.password.message}</p> : null}
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <button disabled={isSubmitting} className="w-full rounded bg-orange-500 px-3 py-2 text-white disabled:opacity-50">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
          <div className="flex items-center justify-between text-sm">
            <Link to="/registro" className="text-orange-600 hover:underline">
              Criar conta
            </Link>
            <Link to="/admin/login" className="text-gray-500 hover:text-gray-700">
              Sou organizador →
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
