import { getDB, formatTempo, distanciaLabel } from "@/lib/db";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ProvaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDB();

  const prova = await db.prepare("SELECT * FROM provas WHERE id = ?").bind(slug).first<{
    id: string; titulo: string; cidade: string; uf: string; data: string;
    distancia_metros: number; organizador: string | null; link_oficial: string | null; status: string;
  }>();

  if (!prova) notFound();

  const { results } = await db.prepare(
    "SELECT * FROM resultados WHERE prova_id = ? ORDER BY tempo_liquido_seg ASC LIMIT 500"
  ).bind(slug).all<{
    id: number; atleta_nome: string; atleta_cidade: string | null; atleta_uf: string | null;
    categoria: string | null; tempo_liquido_seg: number; colocacao_geral: number | null;
  }>();

  const data = new Date(prova.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/provas" className="text-sm text-orange-500 hover:underline">← Voltar para provas</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">{prova.titulo}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
          <span>📍 {prova.cidade}/{prova.uf}</span>
          <span>📅 {data}</span>
          <span>🏃 {distanciaLabel(prova.distancia_metros)}</span>
          {prova.organizador && <span>🏢 {prova.organizador}</span>}
        </div>
        {prova.link_oficial && (
          <a href={prova.link_oficial} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm text-orange-500 hover:underline">
            Site oficial →
          </a>
        )}
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          Resultados ainda não importados para esta prova.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-slate-700">{results.length} finishers</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-12">#</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Atleta</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Local</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Categoria</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Tempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-bold text-orange-500">{r.colocacao_geral ?? i + 1}º</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{r.atleta_nome}</td>
                  <td className="px-4 py-2.5 text-slate-500">{[r.atleta_cidade, r.atleta_uf].filter(Boolean).join("/")}</td>
                  <td className="px-4 py-2.5 text-slate-500">{r.categoria || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">{formatTempo(r.tempo_liquido_seg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
