"use client";
import { useState } from "react";

interface EventoDesc { nome: string; cidade: string; data: string; url: string; }
interface BulkStatus { current: number; total: number; currentName: string; errors: string[]; done: boolean; }

export default function AdminPage() {
  const [tab, setTab] = useState<"url" | "lote" | "bulk" | "prova" | "resultado">("url");
  const [msg, setMsg] = useState("");
  const [eventos, setEventos] = useState<EventoDesc[]>([]);
  const [bulk, setBulk] = useState<BulkStatus | null>(null);
  const [loteUrls, setLoteUrls] = useState("");

  // ── URL única ──────────────────────────────────────────────────────────────
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

  // ── Descobrir Sportschrono ─────────────────────────────────────────────────
  async function descobrir() {
    setEventos([]);
    setBulk(null);
    setMsg("⏳ Buscando corridas no Sportschrono...");
    const r = await fetch("/api/admin/discover");
    const json = await r.json() as { events?: EventoDesc[]; total?: number; erro?: string };
    if (r.ok && json.events) {
      setEventos(json.events);
      setMsg(`✅ ${json.total} corridas encontradas. Clique em "Importar todas" para começar.`);
    } else {
      setMsg(`❌ ${json.erro}`);
    }
  }

  async function importarTodas() {
    if (eventos.length === 0) return;
    const errors: string[] = [];
    setBulk({ current: 0, total: eventos.length, currentName: "", errors, done: false });

    for (let i = 0; i < eventos.length; i++) {
      const ev = eventos[i];
      setBulk(prev => ({ ...prev!, current: i + 1, currentName: ev.nome }));
      try {
        const r = await fetch("/api/admin/scrape", {
          method: "POST",
          body: JSON.stringify({ url: ev.url, titulo: ev.nome }),
          headers: { "Content-Type": "application/json" },
        });
        const json = await r.json() as { erro?: string };
        if (!r.ok) errors.push(`${ev.nome}: ${json.erro}`);
      } catch (err) {
        errors.push(`${ev.nome}: ${String(err)}`);
      }
      await new Promise(res => setTimeout(res, 300));
    }

    setBulk(prev => ({ ...prev!, done: true, errors }));
    setMsg(`✅ Importação concluída! ${eventos.length - errors.length} importadas, ${errors.length} erros.`);
  }

  // ── Lote de URLs ──────────────────────────────────────────────────────────
  async function importarLote() {
    const urls = loteUrls.split("\n").map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) return;
    const errors: string[] = [];
    setBulk({ current: 0, total: urls.length, currentName: "", errors, done: false });
    setMsg("");

    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      setBulk(prev => ({ ...prev!, current: i + 1, currentName: u }));
      try {
        const r = await fetch("/api/admin/scrape", {
          method: "POST",
          body: JSON.stringify({ url: u }),
          headers: { "Content-Type": "application/json" },
        });
        const json = await r.json() as { erro?: string; titulo?: string };
        if (!r.ok) errors.push(`${u}: ${json.erro}`);
      } catch (err) {
        errors.push(`${u}: ${String(err)}`);
      }
      await new Promise(res => setTimeout(res, 300));
    }

    setBulk(prev => ({ ...prev!, done: true, errors }));
    setMsg(`✅ Lote concluído! ${urls.length - errors.length}/${urls.length} importadas.`);
  }

  // ── Manual: prova ──────────────────────────────────────────────────────────
  async function addProva(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/admin/provas", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)), headers: { "Content-Type": "application/json" } });
    setMsg(r.ok ? "✅ Prova adicionada!" : "❌ Erro ao adicionar");
    if (r.ok) (e.target as HTMLFormElement).reset();
  }

  // ── Manual: CSV ───────────────────────────────────────────────────────────
  async function importar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg("⏳ Importando...");
    const r = await fetch("/api/admin/importar", { method: "POST", body: JSON.stringify(Object.fromEntries(fd)), headers: { "Content-Type": "application/json" } });
    const json = await r.json() as { importados?: number; erro?: string };
    setMsg(r.ok ? `✅ ${json.importados} resultados importados!` : `❌ ${json.erro}`);
  }

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "url", label: "🔗 URL única" },
    { id: "lote", label: "📋 Lote de URLs" },
    { id: "bulk", label: "📦 Sportschrono" },
    { id: "prova", label: "+ Cadastrar prova" },
    { id: "resultado", label: "CSV" },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin — RankRun</h1>

      {msg && <div className="bg-slate-100 rounded-lg px-4 py-3 text-sm font-medium">{msg}</div>}

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t.id ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── URL única ── */}
      {tab === "url" && (
        <form onSubmit={importarUrl} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Importar corrida por URL</h2>
          <p className="text-sm text-slate-500">Cole a URL de qualquer corrida suportada.</p>
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
            <div>✅ <strong>Racezone:</strong> <code>https://resultados.racezone.com.br/sportschrono/#/nome-da-corrida</code></div>
            <div>✅ <strong>o2corre:</strong> <code>https://www.o2corre.com.br/resultado/40209/</code></div>
            <div>✅ <strong>BrLive / ChipBrasil:</strong> <code>https://brlive.info/brlive/g-live.html?f=resultados/bsb/evento.clax</code></div>
            <div>✅ <strong>Sportschrono:</strong> <code>https://www.sportschrono.com.br/resultados/g-live.html?f=...</code></div>
            <div className="text-slate-400 pt-1">💡 Para ChipBrasil: clique em &quot;Ver Resultados&quot; e copie a URL do BrLive que abrir.</div>
          </div>
          <input required name="url" type="url" placeholder="https://resultados.racezone.com.br/..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors">
            Importar
          </button>
        </form>
      )}

      {/* ── Lote de URLs ── */}
      {tab === "lote" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Importar várias corridas de uma vez</h2>
          <p className="text-sm text-slate-500">
            Cole uma URL por linha — qualquer plataforma suportada (Racezone, o2corre, BrLive/ChipBrasil, Sportschrono).
            Para o ChipBrasil, use a URL do BrLive que aparece ao clicar em &ldquo;Ver Resultados&rdquo;.
          </p>
          <textarea
            rows={12}
            value={loteUrls}
            onChange={e => setLoteUrls(e.target.value)}
            placeholder={"https://brlive.info/brlive/g-live.html?f=resultados/bsb/evento.clax\nhttps://resultados.racezone.com.br/sportschrono/#/nome-corrida\nhttps://www.o2corre.com.br/resultado/40209/"}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-orange-400"
          />
          {bulk && tab === "lote" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{bulk.done ? "Concluído!" : `Importando ${bulk.current}/${bulk.total}...`}</span>
                <span>{Math.round((bulk.current / bulk.total) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${(bulk.current / bulk.total) * 100}%` }} />
              </div>
              {!bulk.done && <p className="text-xs text-slate-400 truncate">{bulk.currentName}</p>}
              {bulk.done && bulk.errors.length > 0 && (
                <details className="text-xs text-red-600">
                  <summary className="cursor-pointer">{bulk.errors.length} erro(s)</summary>
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    {bulk.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
          <button
            onClick={() => { setBulk(null); importarLote(); }}
            disabled={!loteUrls.trim() || (!!bulk && !bulk.done)}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Importar todas as URLs
          </button>
        </div>
      )}

      {/* ── Bulk Sportschrono ── */}
      {tab === "bulk" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Importar histórico completo do Sportschrono</h2>
          <p className="text-sm text-slate-500">Busca todas as corridas cadastradas no Sportschrono com resultado no Racezone e importa de uma vez.</p>

          <div className="flex gap-3">
            <button onClick={descobrir} className="bg-slate-700 hover:bg-slate-800 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
              1. Descobrir corridas
            </button>
            {eventos.length > 0 && !bulk?.done && (
              <button onClick={importarTodas} disabled={!!bulk && !bulk.done} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
                2. Importar todas ({eventos.length})
              </button>
            )}
          </div>

          {/* Progresso */}
          {bulk && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{bulk.done ? "Concluído!" : `Importando ${bulk.current}/${bulk.total}...`}</span>
                <span>{Math.round((bulk.current / bulk.total) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${(bulk.current / bulk.total) * 100}%` }} />
              </div>
              {!bulk.done && <p className="text-xs text-slate-500 truncate">{bulk.currentName}</p>}
              {bulk.done && bulk.errors.length > 0 && (
                <details className="text-xs text-red-600">
                  <summary className="cursor-pointer">{bulk.errors.length} erros (clique para ver)</summary>
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    {bulk.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Lista descoberta */}
          {eventos.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Corrida</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Cidade</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eventos.map((ev, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 text-slate-700">{ev.nome}</td>
                      <td className="px-3 py-1.5 text-slate-500">{ev.cidade}</td>
                      <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{ev.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Cadastrar prova ── */}
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
          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors">
            Cadastrar prova
          </button>
        </form>
      )}

      {/* ── CSV ── */}
      {tab === "resultado" && (
        <form onSubmit={importar} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Importar resultados (CSV)</h2>
          <p className="text-sm text-slate-500">Formato: <code className="bg-slate-100 px-1 rounded">nome,cidade,uf,categoria,tempo_liquido,tempo_bruto,colocacao_geral</code></p>
          <div>
            <label className="block text-sm text-slate-600 mb-1">ID da prova</label>
            <input required name="prova_id" placeholder="maratona-sp-2026" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Dados CSV</label>
            <textarea required name="csv" rows={10} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400" />
          </div>
          <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors">
            Importar
          </button>
        </form>
      )}
    </div>
  );
}
