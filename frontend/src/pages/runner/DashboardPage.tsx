import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../../components/Header";
import { CorridaCard } from "../../components/CorridaCard";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../services/api";
import { corridasBrasil, ordenarPorData } from "../../data/corridas-brasil";
import { formatarTempo, calcularPace } from "../../utils/format";

type Result = {
  id: string;
  raceName: string;
  raceDate: string;
  raceCity?: string;
  raceUf?: string;
  distanceMeters: number;
  netTimeSeconds: number;
  generalRank?: number;
  categoryName?: string;
};

type Stats = {
  totalRaces: number;
  totalKm: number;
  prs: { distance: number; prSeconds: number | null; raceName: string | null; raceDate?: string }[];
};

const distLabel = (m: number) => {
  if (m === 5000) return "5 km";
  if (m === 10000) return "10 km";
  if (m === 21097) return "21 km";
  if (m === 42195) return "Maratona";
  return `${(m / 1000).toFixed(0)} km`;
};

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentes, setRecentes] = useState<Result[]>([]);

  useEffect(() => {
    api.get<Stats>("/me/results/stats").then((r) => setStats(r.data)).catch(() => setStats(null));
    api.get<Result[]>("/me/results").then((r) => setRecentes(r.data.slice(0, 3))).catch(() => setRecentes([]));
  }, []);

  const proximas = ordenarPorData(corridasBrasil.filter((c) => c.status !== "encerradas")).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="runner" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-100">Olá,</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{user?.name ?? "Corredor"} 👋</h1>
          <p className="mt-2 text-sm text-orange-50">
            Sua vida de corredor num lugar só. Registre resultados, acompanhe seus PRs e descubra novas provas.
          </p>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs font-medium uppercase text-gray-500">Provas concluídas</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.totalRaces ?? 0}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs font-medium uppercase text-gray-500">KM total</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats?.totalKm ?? 0}</p>
          </div>
          {(stats?.prs ?? []).slice(0, 2).map((pr) => (
            <div key={pr.distance} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-medium uppercase text-gray-500">PR {distLabel(pr.distance)}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatarTempo(pr.prSeconds)}</p>
              {pr.raceName ? <p className="mt-1 truncate text-xs text-gray-500">{pr.raceName}</p> : null}
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Últimos resultados</h2>
              <Link to="/app/resultados" className="text-sm font-medium text-orange-600 hover:text-orange-700">
                Ver todos →
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {recentes.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
                  <p className="text-sm text-gray-600">Você ainda não registrou nenhum resultado.</p>
                  <Link
                    to="/app/resultados/novo"
                    className="mt-3 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                  >
                    Registrar primeiro resultado
                  </Link>
                </div>
              ) : (
                recentes.map((r) => (
                  <article key={r.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-gray-900">{r.raceName}</h3>
                        <p className="text-xs text-gray-500">
                          {new Date(r.raceDate).toLocaleDateString("pt-BR")} · {distLabel(r.distanceMeters)}
                          {r.raceCity ? ` · ${r.raceCity}/${r.raceUf ?? ""}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">{formatarTempo(r.netTimeSeconds)}</p>
                        <p className="text-xs text-gray-500">{calcularPace(r.netTimeSeconds, r.distanceMeters)}</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Próximas corridas</h2>
              <Link to="/eventos" className="text-sm font-medium text-orange-600 hover:text-orange-700">
                Ver todas →
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {proximas.map((c) => (
                <CorridaCard key={c.id} corrida={c} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
