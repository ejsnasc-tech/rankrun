import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";
import { useForm } from "react-hook-form";

export function AdminEventsPage() {
  const [events, setEvents] = useState<Array<{ id: string; title: string; date: string }>>([]);
  const { register, handleSubmit, reset } = useForm<{
    title: string;
    slug: string;
    date: string;
    location: string;
    distanceMeters: number;
    slots: number;
    description?: string;
  }>();

  const loadEvents = () => {
    api.get("/events").then((res) => setEvents(res.data));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const onSubmit = async (values: {
    title: string;
    slug: string;
    date: string;
    location: string;
    distanceMeters: number;
    slots: number;
    description?: string;
  }) => {
    await api.post("/events", { ...values, status: "PUBLISHED" });
    reset();
    loadEvents();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="admin" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold">Eventos</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mb-4 grid gap-2 rounded bg-white p-4 shadow-sm md:grid-cols-2">
          <input className="rounded border px-3 py-2" placeholder="Título" {...register("title")} />
          <input className="rounded border px-3 py-2" placeholder="Slug" {...register("slug")} />
          <input className="rounded border px-3 py-2" type="date" {...register("date")} />
          <input className="rounded border px-3 py-2" placeholder="Local" {...register("location")} />
          <input className="rounded border px-3 py-2" type="number" placeholder="Distância (m)" {...register("distanceMeters", { valueAsNumber: true })} />
          <input className="rounded border px-3 py-2" type="number" placeholder="Vagas" {...register("slots", { valueAsNumber: true })} />
          <input className="rounded border px-3 py-2 md:col-span-2" placeholder="Descrição" {...register("description")} />
          <button className="rounded bg-orange-500 px-4 py-2 text-white md:col-span-2">Criar evento</button>
        </form>
        <div className="space-y-3">
          {events.map((event) => (
            <article key={event.id} className="rounded bg-white p-4 shadow-sm">
              <h2 className="font-semibold">{event.title}</h2>
              <p className="text-sm text-gray-600">{new Date(event.date).toLocaleDateString("pt-BR")}</p>
              <div className="mt-2 flex gap-3 text-sm">
                <Link className="text-orange-500" to={`/admin/eventos/${event.id}`}>Gerenciar</Link>
                <Link className="text-orange-500" to={`/admin/eventos/${event.id}/painel-ao-vivo`}>Painel ao vivo</Link>
                <Link className="text-orange-500" to={`/admin/eventos/${event.id}/bibs`}>Bibs</Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
