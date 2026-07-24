"use client";
import { useState } from "react";

export default function AdminPage() {
  const [tab, setTab] = useState<"url" | "prova" | "resultado">("url");
  const [msg, setMsg] = useState("");

  async function importarUrl(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const url = fd.get("url") as string;
    setMsg("⏳ Importando... isso pode levar alguns segundos.");
    const r = await fetch("/api/admin/scrape", { method: "POST", body: JSON.stringify({ url }), headers: { "Content-Type": "application/json" } });
    const json = await r.json() as { importados?: number; titulo?: string; prova_id?: string; erro?: string };
    if (r.ok) {
      setMsg(`✅ "${json.titulo}" importada! ${json.importados} atletas (prova: ${json.prova_id})`);
      (e.target as HTMLFormElement).reset();
    } else {
      setMsg(`❌ ${json.erro}`);
    }
  }

  async function addProva(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/admin/provas", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)), headers: { "Content-Type": "application/json" } });
    setMsg(r.ok ? "✅ Prova adicionada!" : "❌ Erro ao adicionar");
    if (r.ok) (e.target as HTMLFormElement).reset();
  }

  async function importar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg("⏳ Importando...");
    const r = await fetch("/api/admin/importar", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)), headers: { "Content-Type": "application/json" } });
    const json = await r.json() as { importados?: number; erro?: string };
    setMsg(r.ok ? `✅ ${json.importados} resultados importados!` : `❌ ${json.erro}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin — RankRun</h1>

      {msg && <div className="bg-slate-100 rounded-lg px-4 py-3 text-sm font-medium">{msg}</div>}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab("url")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "url" ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>🔗 Importar por URL</button>
        <button onClick={() => setTab("prova")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "prova" ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>+ Cadastrar prova</button>
        <button onClick={() => setTab("resultado")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "resultado" ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>📋 Importar CSV</button>
      </div>

      {tab === "url" && (
        <form onSubmit={importarUrl} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Importar corrida por URL</h2>
          <p className="text-sm text-slate-500">Cole a URL de uma corrida do <strong>Racezone</strong> ou <strong>o2corre</strong>. O sistema busca tudo automaticamente.</p>
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
            <div>✅ <strong>Racezone:</strong> <code>https://resultados.racezone.com.br/sportschrono/#/nome-da-corrida</code></div>
            <div>✅ <strong>o2corre:</strong> <code>https://www.o2corre.com.br/resultado/40209/</code></div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">URL da corrida</label>
            <input required name="url" type="url" placeholder="https://resultados.racezone.com.br/..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors">
            Importar automaticamente
          </button>
        </form>
      )}

      {tab === "prova" && (
        <form onSubmit={addProva} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Cadastrar prova</h2>
          {[
            { name: "id", label: "ID (slug)", placeholder: "maratona-sp-2026" },
            { name: "titulo", label: "Título", placeholder: "Maratona de São Paulo 2026" },
            { name: "cidade", label: "Cidade", placeholder: "São Paulo" },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm text-slate-600 mb-1">{f.label}</label>
              <input required name={f.name} placeholder={f.placeholder} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">UF</label>
              <input required name="uf" placeholder="SP" maxLength={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Data</label>
              <input required type="date" name="data" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Distância</label>
            <select required name="distancia_metros" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
              <option value="5000">5K</option>
              <option value="10000">10K</option>
              <option value="21097">Meia Maratona</option>
              <option value="42195">Maratona</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Link oficial</label>
            <input type="url" name="link_oficial" placeholder="https://..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors">
            Cadastrar prova
          </button>
        </form>
      )}

      {tab === "resultado" && (
        <form onSubmit={importar} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Importar resultados (CSV)</h2>
          <p className="text-sm text-slate-500">Cole os dados em formato CSV: <code className="bg-slate-100 px-1 rounded">nome,cidade,uf,categoria,tempo_liquido,tempo_bruto,colocacao_geral</code></p>
          <div>
            <label className="block text-sm text-slate-600 mb-1">ID da prova</label>
            <input required name="prova_id" placeholder="maratona-sp-2026" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Dados CSV</label>
            <textarea required name="csv" rows={10} placeholder={"João Silva,São Paulo,SP,M30-34,3:45:22,3:47:00,892\nMaria Santos,Rio de Janeiro,RJ,F35-39,4:02:11,,1203"} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400" />
          </div>
          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors">
            Importar
          </button>
        </form>
      )}
    </div>
  );
}
