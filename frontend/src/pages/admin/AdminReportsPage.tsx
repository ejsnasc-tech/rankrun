import { useEffect, useState } from "react";
import { Header } from "../../components/Header";
import { api } from "../../services/api";

export function AdminReportsPage() {
  const [summary, setSummary] = useState({ totalPaid: 0, byCategory: {} as Record<string, number> });

  useEffect(() => {
    api.get("/events").then(async (events) => {
      const registrationsByEvent = await Promise.all(
        events.data.map((event: { id: string }) => api.get(`/events/${event.id}/registrations`).catch(() => ({ data: [] }))),
      );

      const all = registrationsByEvent.flatMap((item) => item.data);
      const totalPaid = all
        .filter((item: { payment?: { status?: string; amount?: string } }) => item.payment?.status === "PAID")
        .reduce((acc: number, item: { payment?: { amount?: string } }) => acc + Number(item.payment?.amount ?? 0), 0);

      const byCategory = all.reduce((acc: Record<string, number>, item: { category?: { name: string } }) => {
        const key = item.category?.name ?? "Sem categoria";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

      setSummary({ totalPaid, byCategory });
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="admin" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold">Relatórios</h1>
        <section className="rounded bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Financeiro</p>
          <p className="text-2xl font-bold text-orange-500">R$ {summary.totalPaid.toFixed(2)}</p>
        </section>

        <section className="mt-4 rounded bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Inscrições por categoria</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(summary.byCategory).map(([category, count]) => (
              <li key={category}>
                {category}: {count}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
