import { getDB } from "@/lib/db";
export const dynamic = "force-dynamic";
import Link from "next/link";

export default async function ProvasPage() {
  const db = await getDB();
  const { results } = await db.prepare(
    "SELECT * FROM provas ORDER BY data DESC LIMIT 200"
  ).all<{
    id: string; titulo: string; cidade: string; uf: string; data: string;
    distancia_metros: number; organizador: string | null; status: string; destaque: number;
  }>();

  const proximas = results.filter(p => p.status !== "encerradas");
  const encerradas = results.filter(p => p.status === "encerradas");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Provas</h1>

      {proximas.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Próximas corridas</h2>
          <div className="grid gap-3">
            {proximas.map(p => <ProvaCard key={p.id} prova={p} />)}
          </div>
        </section>
      )}

      {encerradas.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Resultados disponíveis</h2>
          <div className="grid gap-3">
            {encerradas.map(p => <ProvaCard key={p.id} prova={p} />)}
          </div>
        </section>
      )}

      {results.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          Nenhuma prova cadastrada ainda.
        </div>
      )}
    </div>
  );
}

function ProvaCard({ prova }: { prova: { id: string; titulo: string; cidade: string; uf: string; data: string; status: string; destaque: number } }) {
  const data = new Date(prova.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const statusColor = prova.status === "abertas" ? "text-green-600 bg-green-50" : prova.status === "encerradas" ? "text-slate-500 bg-slate-100" : "text-orange-600 bg-orange-50";
  const statusLabel = prova.status === "abertas" ? "Inscrições abertas" : prova.status === "encerradas" ? "Encerrada" : "Em breve";

  return (
    <Link href={`/provas/${prova.id}`} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-orange-400 hover:shadow-sm transition-all">
      {prova.destaque === 1 && <span className="text-lg">⭐</span>}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 truncate">{prova.titulo}</div>
        <div className="text-sm text-slate-500 mt-0.5">{prova.cidade}/{prova.uf} · {data}</div>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
    </Link>
  );
}
