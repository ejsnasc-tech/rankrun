import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";
import { useForm } from "react-hook-form";

export function AdminEventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<{ title: string } | null>(null);
  const [registrations, setRegistrations] = useState<Array<{ id: string; user: { name: string }; status: string }>>([]);
  const { register, handleSubmit } = useForm<{
    name: string;
    minAge: number;
    maxAge: number;
    gender: "M" | "F" | "ANY";
    price: number;
    maxSlots: number;
  }>();
  const checkpointForm = useForm<{ name: string; kmMark: number; type: "START" | "SPLIT" | "FINISH"; order: number }>();

  useEffect(() => {
    if (!id) return;
    api.get(`/events/${id}`).then((res) => setEvent(res.data));
    api.get(`/events/${id}/registrations`).then((res) => setRegistrations(res.data));
  }, [id]);

  const checkin = async (registrationId: string) => {
    await api.post(`/events/${id}/checkin`, { registrationId });
    const { data } = await api.get(`/events/${id}/registrations`);
    setRegistrations(data);
  };

  const createCategory = async (values: {
    name: string;
    minAge: number;
    maxAge: number;
    gender: "M" | "F" | "ANY";
    price: number;
    maxSlots: number;
  }) => {
    await api.post(`/events/${id}/categories`, values);
    alert("Categoria criada.");
  };

  const createCheckpoint = async (values: { name: string; kmMark: number; type: "START" | "SPLIT" | "FINISH"; order: number }) => {
    await api.post(`/events/${id}/checkpoints`, values);
    alert("Checkpoint criado.");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="admin" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold">Gestão do evento: {event?.title ?? "..."}</h1>
        <section className="mb-4 grid gap-4 md:grid-cols-2">
          <form onSubmit={handleSubmit(createCategory)} className="space-y-2 rounded bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Nova categoria</h2>
            <input className="w-full rounded border px-3 py-2" placeholder="Nome" {...register("name")} />
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded border px-3 py-2" type="number" placeholder="Idade mínima" {...register("minAge", { valueAsNumber: true })} />
              <input className="rounded border px-3 py-2" type="number" placeholder="Idade máxima" {...register("maxAge", { valueAsNumber: true })} />
            </div>
            <select className="w-full rounded border px-3 py-2" {...register("gender")}>
              <option value="ANY">Todos</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
            <input className="w-full rounded border px-3 py-2" type="number" step="0.01" placeholder="Preço" {...register("price", { valueAsNumber: true })} />
            <input className="w-full rounded border px-3 py-2" type="number" placeholder="Máx. vagas" {...register("maxSlots", { valueAsNumber: true })} />
            <button className="rounded bg-orange-500 px-4 py-2 text-white">Criar categoria</button>
          </form>
          <form onSubmit={checkpointForm.handleSubmit(createCheckpoint)} className="space-y-2 rounded bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Novo checkpoint</h2>
            <input className="w-full rounded border px-3 py-2" placeholder="Nome" {...checkpointForm.register("name")} />
            <input className="w-full rounded border px-3 py-2" type="number" step="0.1" placeholder="KM" {...checkpointForm.register("kmMark", { valueAsNumber: true })} />
            <select className="w-full rounded border px-3 py-2" {...checkpointForm.register("type")}>
              <option value="START">START</option>
              <option value="SPLIT">SPLIT</option>
              <option value="FINISH">FINISH</option>
            </select>
            <input className="w-full rounded border px-3 py-2" type="number" placeholder="Ordem" {...checkpointForm.register("order", { valueAsNumber: true })} />
            <button className="rounded bg-orange-500 px-4 py-2 text-white">Criar checkpoint</button>
          </form>
        </section>
        <section className="rounded bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Inscritos / Check-in</h2>
          <div className="space-y-2">
            {registrations.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>{item.user.name} • {item.status}</span>
                <button className="rounded bg-orange-500 px-3 py-1 text-white" onClick={() => checkin(item.id)}>
                  Check-in
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
