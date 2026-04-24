import { useEffect, useMemo, useState } from "react";
import { Header } from "../../components/Header";
import { CorridaCard } from "../../components/CorridaCard";
import { api } from "../../services/api";
import {
  corridasBrasil,
  ordenarPorData,
  type CorridaCatalogo,
  type StatusInscricao,
} from "../../data/corridas-brasil";

type EventoApi = {
  id: string;
  title: string;
  slug: string;
  date: string;
  location: string;
  distanceMeters: number;
  status?: string;
};

type Filtro = "todas" | StatusInscricao;
type FaixaDist = "todas" | "ate10" | "meia" | "maratona" | "ultra";

function eventoApiParaCatalogo(e: EventoApi): CorridaCatalogo {
  const [cidade, uf = ""] = e.location.split(/[-,]/).map((s) => s.trim());
  return {
    id: `api-${e.id}`,
    titulo: e.title,
    cidade: cidade || e.location,
    uf: uf || "BR",
    pais: "BR",
    data: e.date.slice(0, 10),
    distancias: [`${(e.distanceMeters / 1000).toFixed(0)} km`],
    organizador: "Plataforma corridasderua",
    status: "abertas",
    linkOficial: `/eventos/${e.slug}`,
    destaque: true,
  };
}

const filtros: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "abertas", label: "Inscrições abertas" },
  { id: "em-breve", label: "Em breve" },
  { id: "encerradas", label: "Encerradas" },
];

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const faixas: { id: FaixaDist; label: string }[] = [
  { id: "todas", label: "Qualquer distância" },
  { id: "ate10", label: "Até 10 km" },
  { id: "meia", label: "Meia maratona (21K)" },
  { id: "maratona", label: "Maratona (42K)" },
  { id: "ultra", label: "Ultra (>42K)" },
];

function maxKmDeCorrida(c: CorridaCatalogo): number {
  let max = 0;
  for (const d of c.distancias) {
    const m = d.match(/(\d+([.,]\d+)?)\s*k/i);
    if (m) {
      const v = parseFloat(m[1].replace(",", "."));
      if (v > max) max = v;
    }
  }
  return max;
}

function corresponde(c: CorridaCatalogo, faixa: FaixaDist): boolean {
  if (faixa === "todas") return true;
  const km = maxKmDeCorrida(c);
  if (faixa === "ate10") return km > 0 && km <= 10;
  if (faixa === "meia") return km >= 18 && km <= 25;
  if (faixa === "maratona") return km >= 40 && km <= 45;
  if (faixa === "ultra") return km > 45;
  return true;
}

export function EventsPage() {
  const [eventosApi, setEventosApi] = useState<EventoApi[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [faixa, setFaixa] = useState<FaixaDist>("todas");
  const [pais, setPais] = useState<string>("");

  useEffect(() => {
    api.get<EventoApi[]>("/events").then((res) => setEventosApi(res.data)).catch(() => setEventosApi([]));
  }, []);

  const todas = useMemo(() => {
    const daApi = eventosApi.map(eventoApiParaCatalogo);
    return ordenarPorData([...daApi, ...corridasBrasil]);
  }, [eventosApi]);

  const ufsDisponiveis = useMemo(() => {
    const set = new Set<string>();
    todas.forEach((c) => { if (c.pais === "BR" && c.uf) set.add(c.uf); });
    return Array.from(set).sort();
  }, [todas]);

  const paisesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    todas.forEach((c) => set.add(c.pais));
    return Array.from(set).sort();
  }, [todas]);

  const filtradas = useMemo(() => {
    return todas.filter((c) => {
      if (filtro !== "todas" && c.status !== filtro) return false;
      if (uf && c.uf !== uf) return false;
      if (pais && c.pais !== pais) return false;
      if (mes) {
        const m = parseInt(c.data.slice(5, 7), 10);
        if (m !== parseInt(mes, 10)) return false;
      }
      if (!corresponde(c, faixa)) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        return (
          c.titulo.toLowerCase().includes(q) ||
          c.cidade.toLowerCase().includes(q) ||
          c.uf.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [todas, filtro, busca, uf, pais, mes, faixa]);

  const totalAbertas = todas.filter((c) => c.status === "abertas").length;

  const algumFiltroAtivo = filtro !== "todas" || busca || uf || mes || faixa !== "todas" || pais;
  const limparTudo = () => {
    setFiltro("todas"); setBusca(""); setUf(""); setMes(""); setFaixa("todas"); setPais("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="public" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-100">Calendário nacional</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Corridas de rua no Brasil</h1>
          <p className="mt-2 text-sm text-orange-50">
            {totalAbertas} provas com inscrições abertas e várias em breve. Explore por cidade, distância ou status.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {filtros.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  filtro === f.id ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cidade, UF ou nome..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-400 focus:outline-none sm:w-72"
          />
        </div>

        <div className="mt-4 grid gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500">País</label>
            <select value={pais} onChange={(e) => setPais(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none">
              <option value="">Todos</option>
              {paisesDisponiveis.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500">UF (Brasil)</label>
            <select value={uf} onChange={(e) => setUf(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none">
              <option value="">Todas</option>
              {ufsDisponiveis.map((u) => (<option key={u} value={u}>{u}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500">Mês</label>
            <select value={mes} onChange={(e) => setMes(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none">
              <option value="">Qualquer</option>
              {meses.map((m, i) => (<option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500">Distância</label>
            <select value={faixa} onChange={(e) => setFaixa(e.target.value as FaixaDist)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none">
              {faixas.map((f) => (<option key={f.id} value={f.id}>{f.label}</option>))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <p className="text-gray-600"><strong>{filtradas.length}</strong> {filtradas.length === 1 ? "corrida" : "corridas"} encontradas</p>
          {algumFiltroAtivo && (
            <button type="button" onClick={limparTudo} className="text-xs font-medium text-orange-600 hover:underline">
              Limpar filtros
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((corrida) => (<CorridaCard key={corrida.id} corrida={corrida} />))}
        </div>

        {filtradas.length === 0 ? (
          <p className="mt-12 text-center text-sm text-gray-500">Nenhuma corrida encontrada com esses filtros.</p>
        ) : null}

        <p className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-500">
          Catálogo curado de corridas tradicionais do Brasil. Datas e detalhes podem mudar — confirme sempre no site oficial do organizador antes de se inscrever.
        </p>
      </main>
    </div>
  );
}
