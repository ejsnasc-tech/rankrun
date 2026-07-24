import { getDB, distanciaLabel } from "@/lib/db";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import ResultadosClient from "./ResultadosClient";

export default async function ProvaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDB();

  const prova = await db.prepare("SELECT * FROM provas WHERE id = ?").bind(slug).first<{
    id: string; titulo: string; cidade: string; uf: string; data: string;
    distancia_metros: number; organizador: string | null; link_oficial: string | null; status: string;
  }>();

  if (!prova) notFound();

  const { results } = await db.prepare(
    "SELECT * FROM resultados WHERE prova_id = ? ORDER BY tempo_liquido_seg ASC LIMIT 2000"
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
        <ResultadosClient results={results} />
      )}
    </div>
  );
}
