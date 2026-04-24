import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../services/api";
import { formatarTempo, formatarDistancia } from "../../utils/format";

interface Badge {
  code: string;
  title: string;
  subtitle: string;
  icon: string;
}
interface PR {
  distance: number;
  prSeconds: number;
  raceName: string;
  raceDate: string;
}
interface ResultRow {
  id: string;
  raceName: string;
  raceDate: string;
  raceCity?: string | null;
  raceUf?: string | null;
  distanceMeters: number;
  netTimeSeconds: number;
  generalRank?: number | null;
  categoryName?: string | null;
  categoryRank?: number | null;
}
interface Profile {
  user: { name: string; bio?: string | null; city?: string | null; uf?: string | null; slug: string; since: string };
  stats: { totalRaces: number; totalKm: number; prs: PR[] };
  badges: Badge[];
  results: ResultRow[];
}

const distLabel: Record<number, string> = {
  5000: "5 km",
  10000: "10 km",
  21097: "Meia",
  42195: "Maratona",
};

export function AthleteProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<Profile>(`/public/atletas/${slug}`)
      .then((r) => setData(r.data))
      .catch((err) => setErro(err?.response?.status === 404 ? "Perfil não encontrado." : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [slug]);

  const compartilhar = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: data?.user.name ?? "Perfil", url });
        return;
      } catch {
        /* user cancelou */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">Carregando…</div>
    );
  }
  if (erro || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <p className="text-2xl">🔍</p>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">{erro ?? "Perfil indisponível"}</h1>
        <Link to="/" className="mt-4 rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white">
          Ir para a home
        </Link>
      </div>
    );
  }

  const { user, stats, badges, results } = data;
  const sinceYear = new Date(user.since).getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simples (público, sem dependência de auth) */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-orange-600">
            corridasderua
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link to="/eventos" className="hover:text-gray-900">
              Corridas
            </Link>
            <Link to="/login" className="hover:text-gray-900">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-500 to-rose-500 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
                {user.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <h1 className="mt-3 text-3xl font-bold">{user.name}</h1>
              {(user.city || user.uf) && (
                <p className="mt-1 text-white/80">
                  📍 {user.city}
                  {user.city && user.uf ? " · " : ""}
                  {user.uf}
                </p>
              )}
              {user.bio && <p className="mt-3 max-w-xl text-white/90">{user.bio}</p>}
              <p className="mt-2 text-xs text-white/70">No corridasderua desde {sinceYear}</p>
            </div>
            <button
              onClick={compartilhar}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50"
            >
              {copiado ? "✓ Link copiado!" : "🔗 Compartilhar perfil"}
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Provas" value={stats.totalRaces} />
            <Stat label="Distância total" value={`${stats.totalKm} km`} />
            <Stat
              label="PR 10K"
              value={prFor(stats.prs, 10000) ? formatarTempo(prFor(stats.prs, 10000)!.prSeconds) : "—"}
            />
            <Stat
              label="PR Maratona"
              value={prFor(stats.prs, 42195) ? formatarTempo(prFor(stats.prs, 42195)!.prSeconds) : "—"}
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Badges */}
        {badges.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Conquistas</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {badges.map((b) => (
                <div
                  key={b.code}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm"
                >
                  <div className="text-3xl">{b.icon}</div>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{b.title}</p>
                  <p className="text-xs text-gray-500">{b.subtitle}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRs detalhados */}
        {stats.prs.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Recordes pessoais</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.prs.map((pr) => (
                <div key={pr.distance} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                  <p className="text-xs uppercase text-gray-500">{distLabel[pr.distance] ?? `${pr.distance}m`}</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-orange-600">
                    {formatarTempo(pr.prSeconds)}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-600">{pr.raceName}</p>
                  <p className="text-xs text-gray-400">{new Date(pr.raceDate).toLocaleDateString("pt-BR")}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Histórico */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Histórico de provas</h2>
          {results.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Ainda não tem provas registradas.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Prova</th>
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Distância</th>
                    <th className="px-4 py-2">Tempo</th>
                    <th className="px-4 py-2">Pos.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.raceName}</p>
                        {(r.raceCity || r.raceUf) && (
                          <p className="text-xs text-gray-500">
                            {r.raceCity}
                            {r.raceCity && r.raceUf ? " / " : ""}
                            {r.raceUf}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(r.raceDate).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatarDistancia(r.distanceMeters)}</td>
                      <td className="px-4 py-3 font-mono text-gray-900">{formatarTempo(r.netTimeSeconds)}</td>
                      <td className="px-4 py-3 text-gray-600">{r.generalRank ? `${r.generalRank}º` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-10 rounded-xl bg-orange-50 p-6 text-center ring-1 ring-orange-100">
          <p className="text-sm text-orange-900">
            Quer montar seu próprio histórico de provas?
          </p>
          <Link
            to="/registro"
            className="mt-3 inline-block rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Criar minha página de corredor →
          </Link>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/15 p-4 backdrop-blur">
      <p className="text-xs uppercase text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function prFor(prs: PR[], distance: number): PR | undefined {
  return prs.find((p) => p.distance === distance);
}
