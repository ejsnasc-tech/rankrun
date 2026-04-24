import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";
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
  categoryRank?: number;
  certificateUrl?: string;
};

const distLabel = (m: number) => `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 2)} km`;

export function ResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = () => {
    api
      .get<Result[]>("/me/results")
      .then((r) => setResults(r.data))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  useEffect(carregar, []);

  const remover = async (id: string) => {
    if (!confirm("Remover este resultado?")) return;
    await api.delete(`/me/results/${id}`);
    carregar();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="runner" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meus resultados</h1>
            <p className="mt-1 text-sm text-gray-600">Histórico completo das provas que você correu.</p>
          </div>
          <Link
            to="/app/resultados/novo"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            + Novo resultado
          </Link>
        </div>

        {loading ? (
          <p className="mt-8 text-center text-sm text-gray-500">Carregando…</p>
        ) : results.length === 0 ? (
          <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-600">Você ainda não registrou nenhum resultado.</p>
            <Link
              to="/app/resultados/novo"
              className="mt-4 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Registrar primeiro resultado
            </Link>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Prova</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Distância</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Tempo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Pace</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Pos.</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{r.raceName}</p>
                      {r.raceCity ? (
                        <p className="text-xs text-gray-500">
                          {r.raceCity}
                          {r.raceUf ? ` / ${r.raceUf}` : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(r.raceDate).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">{distLabel(r.distanceMeters)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-orange-600">
                      {formatarTempo(r.netTimeSeconds)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {calcularPace(r.netTimeSeconds, r.distanceMeters)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {r.generalRank ? `${r.generalRank}º` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {r.certificateUrl ? (
                        <a
                          href={r.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mr-3 text-orange-600 hover:underline"
                        >
                          Certif.
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => remover(r.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
