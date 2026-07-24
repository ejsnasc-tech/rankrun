import { getDB, formatTempo, distanciaLabel } from "@/lib/db";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";

interface RowResult {
  prova_id: string;
  prova_titulo: string;
  prova_data: string;
  prova_cidade: string;
  prova_uf: string;
  prova_distancia: number;
  categoria: string | null;
  tempo_liquido_seg: number;
  tempo_bruto_seg: number | null;
  colocacao_geral: number | null;
}

export default async function AtletaPage({ params }: { params: Promise<{ nome: string }> }) {
  const { nome: nomeEnc } = await params;
  const nome = decodeURIComponent(nomeEnc);

  const db = await getDB();

  const { results } = await db.prepare(`
    SELECT
      r.prova_id,
      p.titulo  AS prova_titulo,
      p.data    AS prova_data,
      p.cidade  AS prova_cidade,
      p.uf      AS prova_uf,
      p.distancia_metros AS prova_distancia,
      r.categoria,
      r.tempo_liquido_seg,
      r.tempo_bruto_seg,
      r.colocacao_geral
    FROM resultados r
    JOIN provas p ON r.prova_id = p.id
    WHERE r.atleta_nome = ?
    ORDER BY p.data DESC
  `).bind(nome).all<RowResult>();

  if (results.length === 0) notFound();

  const melhoresPorDist: Record<number, RowResult> = {};
  for (const r of results) {
    const dist = r.prova_distancia;
    if (!melhoresPorDist[dist] || r.tempo_liquido_seg < melhoresPorDist[dist].tempo_liquido_seg) {
      melhoresPorDist[dist] = r;
    }
  }
  const destaques = Object.entries(melhoresPorDist).sort((a, b) => Number(a[0]) - Number(b[0]));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/provas" className="text-sm text-orange-500 hover:underline">← Voltar para provas</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">{nome}</h1>
        <p className="text-slate-500 mt-1">{results.length} {results.length === 1 ? "prova" : "provas"} concluída{results.length !== 1 ? "s" : ""}</p>
      </div>

      {destaques.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Melhores tempos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {destaques.map(([dist, r]) => (
              <div key={dist} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">
                  {distanciaLabel(Number(dist))}
                </div>
                <div className="text-2xl font-bold text-slate-800 font-mono tabular-nums">
                  {formatTempo(r.tempo_liquido_seg)}
                </div>
                <div className="text-xs text-slate-400 mt-1 truncate">{r.prova_titulo}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Histórico de provas</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Data</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Prova</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Categoria</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">#</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Tempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r, i) => {
                  const data = new Date(r.prova_data + "T12:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "short", year: "numeric",
                  });
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{data}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        <Link href={`/provas/${r.prova_id}`} className="hover:text-orange-500 hover:underline">
                          {r.prova_titulo}
                        </Link>
                        <span className="ml-2 text-xs text-slate-400">{distanciaLabel(r.prova_distancia)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{r.categoria || "—"}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">
                        {r.colocacao_geral != null ? `${r.colocacao_geral}º` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800 tabular-nums">
                        {formatTempo(r.tempo_liquido_seg)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
