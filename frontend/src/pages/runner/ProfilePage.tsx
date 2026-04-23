import { useForm } from "react-hook-form";
import { Header } from "../../components/Header";
import { api } from "../../services/api";

export function ProfilePage() {
  const { register, handleSubmit } = useForm<{
    allergies?: string;
    conditions?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }>();

  const onSubmit = async (values: {
    allergies?: string;
    conditions?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }) => {
    await api.put("/me/medical-info", values);
    alert("Dados atualizados com sucesso.");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="runner" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Perfil e dados médicos</h1>
          <input {...register("allergies")} className="w-full rounded border px-3 py-2" placeholder="Alergias" />
          <input {...register("conditions")} className="w-full rounded border px-3 py-2" placeholder="Condições médicas" />
          <input {...register("emergencyContactName")} className="w-full rounded border px-3 py-2" placeholder="Contato de emergência" />
          <input {...register("emergencyContactPhone")} className="w-full rounded border px-3 py-2" placeholder="Telefone de emergência" />
          <button className="rounded bg-orange-500 px-4 py-2 text-white">Salvar</button>
        </form>
      </main>
    </div>
  );
}
