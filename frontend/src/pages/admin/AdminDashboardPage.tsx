import { useEffect, useState } from "react";
import { Header } from "../../components/Header";
import { api } from "../../services/api";

export function AdminDashboardPage() {
  const [kpis, setKpis] = useState({ activeEvents: 0, totalRegistrations: 0, revenue: 0 });

  useEffect(() => {
    api.get("/events").then((events) => {
      const activeEvents = events.data.length;
      Promise.all(
        events.data.map((event: { id: string }) => api.get(`/events/${event.id}/registrations`).catch(() => ({ data: [] }))),
      ).then((registrationsByEvent) => {
        const all = registrationsByEvent.flatMap((item) => item.data);
        const revenue = all
          .filter((item: { payment?: { status?: string; amount?: string } }) => item.payment?.status === "PAID")
          .reduce((acc: number, item: { payment?: { amount?: string } }) => acc + Number(item.payment?.amount ?? 0), 0);
        setKpis({ activeEvents, totalRegistrations: all.length, revenue });
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="admin" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold">Dashboard da empresa</h1>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Eventos ativos</p>
            <p className="text-3xl font-bold text-orange-500">{kpis.activeEvents}</p>
          </article>
          <article className="rounded bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Inscritos totais</p>
            <p className="text-3xl font-bold text-orange-500">{kpis.totalRegistrations}</p>
          </article>
          <article className="rounded bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Receita</p>
            <p className="text-3xl font-bold text-orange-500">R$ {kpis.revenue.toFixed(2)}</p>
          </article>
        </div>
      </main>
    </div>
  );
}
