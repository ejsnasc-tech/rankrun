import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { formatarTempo } from "../../utils/format";

interface Atleta {
  name: string;
  slug: string;
  city: string | null;
  uf: string | null;
  bio: string | null;
  totalRaces: number;
}
interface RankingEntry {
  name: string;
  slug: string;
  city: string | null;
  uf: string | null;
  netTimeSeconds: number;
  raceName: string;
  raceDate: string;
}
interface Ranking {
  distance: number;
  label: string;
  top: RankingEntry[];
}

export function AthletesPage() {
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState("");
  const [aba, setAba] = useState<"atletas" | "rankings">("atletas");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    Promise.all([
      api.get<{ atletas: Atleta[] }>("/public/atletas", { params: { q: busca || undefined, uf: uf || undefined } }),
      api.get<{ rankings: Ranking[] }>("/public/rankings"),
    ])
      .then(([a, r]) => {
        setAtletas(a.data.atletas);
        setRankings(r.data.rankings);
      })
      .finally(() => setCarregando(false));
  }, [busca, uf]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-orange-600">corridasderua</Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link to="/eventos" className="hover:text-gray-900">Corridas</Link>
            <Link to="/atletas" className="font-semibold text-gray-900">Atletas</Link>
            <Link to="/login" className="hover:text-gray-900">Entrar</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 p-6 text-white shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-purple-100">Comunidade</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Atletas e rankings</h1>
          <p className="mt-2 text-sm text-purple-50">
            Conheça outros corredores, veja os melhores tempos por distância e descubra atletas da sua cidade.
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setAba("atletas")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              aba === "atletas" ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200"
            }`}
          >
            Atletas
          </button>
          <button
            onClick={() => setAba("rankings")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              aba === "rankings" ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200"
            }`}
          >
            🏆 Rankings
          </button>
        </div>

        {aba === "atletas" && (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                type="search"
                placeholder="Buscar por nome ou cidade..."
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              />
              <input
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="UF"
                className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm uppercase focus:border-orange-400 focus:outline-none"
              />
            </div>

            {carregando ? (
              <p className="mt-8 text-center text-sm text-gray-500">Carregando…</p>
            ) : atletas.length === 0 ? (
              <p className="mt-8 text-center text-sm text-gray-500">Nenhum atleta encontrado.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {atletas.map((a) => (
                  <Link
                    key={a.slug}
                    to={`/atleta/${a.slug}`}
                    className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:ring-orange-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-sm font-bold text-white">
                        {a.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-500">
                          {a.city ?? "—"}{a.city && a.uf ? " · " : ""}{a.uf ?? ""}
                        </p>
                      </div>
                    </div>
                    {a.bio && <p className="mt-3 line-clamp-2 text-xs text-gray-600">{a.bio}</p>}
                    <p className="mt-3 text-xs text-orange-600">{a.totalRaces} {a.totalRaces === 1 ? "prova" : "provas"}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {aba === "rankings" && (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {rankings.map((r) => (
              <div key={r.distance} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <h3 className="text-base font-bold text-gray-900">🏆 {r.label}</h3>
                {r.top.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">Sem registros públicos ainda nesta distância.</p>
                ) : (
                  <ol className="mt-3 divide-y divide-gray-100 text-sm">
                    {r.top.map((entry, idx) => (
                      <li key={`${r.distance}-${entry.slug}`} className="flex items-center gap-3 py-2">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0
                              ? "bg-yellow-400 text-yellow-900"
                              : idx === 1
                              ? "bg-gray-300 text-gray-800"
                              : idx === 2
                              ? "bg-amber-700 text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <Link to={`/atleta/${entry.slug}`} className="min-w-0 flex-1 hover:underline">
                          <p className="truncate font-medium text-gray-900">{entry.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {entry.city ?? ""}{entry.city && entry.uf ? "/" : ""}{entry.uf ?? ""} · {entry.raceName}
                          </p>
                        </Link>
                        <span className="font-mono text-sm font-bold text-orange-600">
                          {formatarTempo(entry.netTimeSeconds)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
