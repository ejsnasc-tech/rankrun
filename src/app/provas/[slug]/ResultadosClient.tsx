"use client";
import { useState, useMemo } from "react";
import { formatTempo } from "@/lib/db";

interface Resultado {
  id: number;
  atleta_nome: string;
  atleta_cidade: string | null;
  atleta_uf: string | null;
  categoria: string | null;
  tempo_liquido_seg: number;
  colocacao_geral: number | null;
}

function parseSexo(categoria: string | null): "M" | "F" | null {
  if (!categoria) return null;
  const c = categoria.toUpperCase().trim();
  if (/FEMININO|FEM\.?/.test(c) || /^F[\d\s/\-]/.test(c) || c === "F") return "F";
  if (/MASCULINO|MASC\.?/.test(c) || /^M[\d\s/\-]/.test(c) || c === "M") return "M";
  return null;
}

export default function ResultadosClient({ results }: { results: Resultado[] }) {
  const [sexo, setSexo] = useState<"todos" | "M" | "F">("todos");
  const [busca, setBusca] = useState("");

  const temMasculino = useMemo(() => results.some(r => parseSexo(r.categoria) === "M"), [results]);
  const temFeminino = useMemo(() => results.some(r => parseSexo(r.categoria) === "F"), [results]);
  const temFiltroSexo = temMasculino && temFeminino;

  const filtered = useMemo(() => {
    let r = results;
    if (sexo !== "todos") r = r.filter(item => parseSexo(item.categoria) === sexo);
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      r = r.filter(item => item.atleta_nome.toLowerCase().includes(q));
    }
    return r;
  }, [results, sexo, busca]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center gap-3">
        <span className="font-semibold text-slate-700 shrink-0">{filtered.length} finishers</span>

        {temFiltroSexo && (
          <div className="flex gap-1">
            {(["todos", "M", "F"] as const).map(opt => {
              const label = opt === "todos" ? "Todos" : opt === "M" ? "Masculino" : "Feminino";
              const active =
                opt === "todos" ? "bg-orange-500 text-white" :
                opt === "M" ? "bg-blue-500 text-white" :
                "bg-pink-500 text-white";
              const idle = "bg-slate-100 text-slate-600 hover:bg-slate-200";
              return (
                <button
                  key={opt}
                  onClick={() => setSexo(opt)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${sexo === opt ? active : idle}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <input
          type="text"
          placeholder="Buscar atleta..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="ml-auto border border-slate-200 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-orange-400 min-w-0 w-40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">Nenhum resultado encontrado.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-12">#</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Atleta</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">Local</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Categoria</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Tempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-bold text-orange-500 tabular-nums">
                    {sexo === "todos" ? (r.colocacao_geral ?? i + 1) : i + 1}º
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{r.atleta_nome}</td>
                  <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{[r.atleta_cidade, r.atleta_uf].filter(Boolean).join("/") || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell">{r.categoria || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800 tabular-nums">{formatTempo(r.tempo_liquido_seg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
