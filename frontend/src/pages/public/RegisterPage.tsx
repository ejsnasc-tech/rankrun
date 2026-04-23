import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Header } from "../../components/Header";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  birthDate: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    await createAccount(values);
    navigate("/app/minhas-provas");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="public" />
      <main className="mx-auto max-w-md px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Criar conta</h1>
          <input {...register("name")} placeholder="Nome" className="w-full rounded border px-3 py-2" />
          {errors.name ? <p className="text-sm text-red-500">{errors.name.message}</p> : null}
          <input {...register("email")} placeholder="E-mail" className="w-full rounded border px-3 py-2" />
          {errors.email ? <p className="text-sm text-red-500">{errors.email.message}</p> : null}
          <input {...register("password")} type="password" placeholder="Senha" className="w-full rounded border px-3 py-2" />
          {errors.password ? <p className="text-sm text-red-500">{errors.password.message}</p> : null}
          <input {...register("birthDate")} type="date" className="w-full rounded border px-3 py-2" />
          <input {...register("document")} placeholder="CPF" className="w-full rounded border px-3 py-2" />
          <input {...register("phone")} placeholder="Telefone" className="w-full rounded border px-3 py-2" />
          <button disabled={isSubmitting} className="w-full rounded bg-orange-500 px-3 py-2 text-white disabled:opacity-50">
            {isSubmitting ? "Criando..." : "Criar conta"}
          </button>
        </form>
      </main>
    </div>
  );
}
