import { useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";
import { parseTempo, formatarTempo, formatarDistancia } from "../../utils/format";
import { corridasBrasil } from "../../data/corridas-brasil";

const distanciasComuns = [
  { label: "5 km", metros: 5000 },
  { label: "10 km", metros: 10000 },
  { label: "Meia (21,097 km)", metros: 21097 },
  { label: "Maratona (42,195 km)", metros: 42195 },
];

interface FormState {
  raceCatalogId: string;
  raceName: string;
  raceDate: string;
  raceCity: string;
  raceUf: string;
  distancia: string;
  tempo: string;
  generalRank: string;
  categoryName: string;
  certificateUrl: string;
}

const empty: FormState = {
  raceCatalogId: "",
  raceName: "",
  raceDate: "",
  raceCity: "",
  raceUf: "",
  distancia: "",
  tempo: "",
  generalRank: "",
  categoryName: "",
  certificateUrl: "",
};

interface ImportResponse {
  raceName?: string;
  raceDate?: string;
  raceCity?: string;
  raceUf?: string;
  distanceMeters?: number;
  netTimeSeconds?: number;
  generalRank?: number;
  confidence: { raceName: boolean; raceDate: boolean; distanceMeters: boolean; netTimeSeconds: boolean };
}

interface LookupResponse {
  raceCatalogId: string;
  raceName: string;
  raceDate: string;
  raceCity: string;
  raceUf: string;
  distanceMeters: number;
  netTimeSeconds: number;
  grossTimeSeconds?: number;
  generalRank?: number;
  categoryName?: string;
  categoryRank?: number;
}

function snapToBucket(meters: number): string {
  const buckets = [5000, 10000, 21097, 42195];
  const closest = buckets.reduce((a, b) => (Math.abs(b - meters) < Math.abs(a - meters) ? b : a));
  if (Math.abs(closest - meters) <= 500) return String(closest);
  return String(meters);
}

type Modo = "buscar" | "certificado" | "manual";

export function NewResultPage() {
  const nav = useNavigate();
  const [modo, setModo] = useState<Modo>("buscar");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  // Estado da busca
  const [buscando, setBuscando] = useState(false);
  const [buscaCorrida, setBuscaCorrida] = useState("");
  const [buscaIdent, setBuscaIdent] = useState("cpf"); // "cpf" | "bib"
  const [buscaBib, setBuscaBib] = useState("");
  const [buscaResultado, setBuscaResultado] = useState<LookupResponse | null>(null);
  const [buscaErro, setBuscaErro] = useState<{ msg: string; hint?: string; siteOficial?: string } | null>(null);

  const set = (k: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((s) => ({ ...s, [k]: e.target.value }));
  };

  const onCatalogChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const c = corridasBrasil.find((x) => x.id === id);
    setForm((s) => ({
      ...s,
      raceCatalogId: id,
      raceName: c?.titulo ?? s.raceName,
      raceCity: c?.cidade ?? s.raceCity,
      raceUf: c?.uf ?? s.raceUf,
      raceDate: c ? c.data.slice(0, 10) : s.raceDate,
    }));
  };

  // === Buscar pela prova ===
  const onBuscar = async (e: FormEvent) => {
    e.preventDefault();
    setBuscaErro(null);
    setBuscaResultado(null);
    if (!buscaCorrida) {
      setBuscaErro({ msg: "Escolha a prova primeiro." });
      return;
    }
    if (buscaIdent === "bib" && !buscaBib.trim()) {
      setBuscaErro({ msg: "Informe seu número de peito." });
      return;
    }
    setBuscando(true);
    try {
      const { data } = await api.post<LookupResponse>("/me/results/lookup", {
        raceCatalogId: buscaCorrida,
        useMyCpf: buscaIdent === "cpf",
        bib: buscaIdent === "bib" ? buscaBib.trim() : undefined,
      });
      setBuscaResultado(data);
    } catch (err: any) {
      const status = err?.response?.status;
      const corridaCat = corridasBrasil.find((c) => c.id === buscaCorrida);
      if (status === 404) {
        setBuscaErro({
          msg: err.response?.data?.message ?? "Resultado não encontrado.",
          hint: err.response?.data?.hint,
          siteOficial: corridaCat?.linkOficial,
        });
      } else {
        setBuscaErro({ msg: err?.response?.data?.message ?? "Falha na busca." });
      }
    } finally {
      setBuscando(false);
    }
  };

  const salvarResultadoBuscado = async () => {
    if (!buscaResultado) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post("/me/results", {
        raceCatalogId: buscaResultado.raceCatalogId,
        raceName: buscaResultado.raceName,
        raceDate: buscaResultado.raceDate,
        raceCity: buscaResultado.raceCity,
        raceUf: buscaResultado.raceUf,
        distanceMeters: buscaResultado.distanceMeters,
        netTimeSeconds: buscaResultado.netTimeSeconds,
        grossTimeSeconds: buscaResultado.grossTimeSeconds,
        generalRank: buscaResultado.generalRank,
        categoryName: buscaResultado.categoryName,
        categoryRank: buscaResultado.categoryRank,
      });
      nav("/app/resultados");
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro ao salvar.");
      setSalvando(false);
    }
  };

  // === Importar certificado ===
  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setImportMsg(null);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<ImportResponse>("/me/results/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((s) => ({
        ...s,
        raceName: data.raceName ?? s.raceName,
        raceDate: data.raceDate ?? s.raceDate,
        raceCity: data.raceCity ?? s.raceCity,
        raceUf: data.raceUf ?? s.raceUf,
        distancia: data.distanceMeters ? snapToBucket(data.distanceMeters) : s.distancia,
        tempo: data.netTimeSeconds ? formatarTempo(data.netTimeSeconds) : s.tempo,
        generalRank: data.generalRank ? String(data.generalRank) : s.generalRank,
      }));
      const ok = Object.values(data.confidence).filter(Boolean).length;
      setImportMsg(`Detectamos ${ok}/4 campos automaticamente. Revise e ajuste antes de salvar.`);
      setModo("manual"); // muda para o form completo
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Falha ao importar.");
    } finally {
      setImportando(false);
      e.target.value = "";
    }
  };

  // === Salvar manual ===
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    const netTimeSeconds = parseTempo(form.tempo);
    if (!netTimeSeconds) {
      setErro("Tempo inválido. Use o formato HH:MM:SS ou MM:SS.");
      return;
    }
    const distanceMeters = parseInt(form.distancia, 10);
    if (!distanceMeters) {
      setErro("Selecione a distância.");
      return;
    }
    const payload: Record<string, unknown> = {
      raceName: form.raceName.trim(),
      raceDate: form.raceDate,
      distanceMeters,
      netTimeSeconds,
      raceCity: form.raceCity.trim() || undefined,
      raceUf: form.raceUf.trim().toUpperCase() || undefined,
      raceCatalogId: form.raceCatalogId || undefined,
      generalRank: form.generalRank ? parseInt(form.generalRank, 10) : undefined,
      categoryName: form.categoryName.trim() || undefined,
      certificateUrl: form.certificateUrl.trim() || undefined,
    };
    setSalvando(true);
    try {
      await api.post("/me/results", payload);
      nav("/app/resultados");
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro ao salvar.");
      setSalvando(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none";

  const TabBtn = ({ value, icon, label }: { value: Modo; icon: string; label: string }) => (
    <button
      type="button"
      onClick={() => setModo(value)}
      className={`flex flex-1 flex-col items-center gap-1 rounded-lg border-2 px-4 py-3 text-center transition ${
        modo === value
          ? "border-orange-500 bg-orange-50 text-orange-900"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="runner" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Registrar resultado</h1>
        <p className="mt-1 text-sm text-gray-600">
          Escolha como você quer adicionar uma prova ao seu histórico.
        </p>

        {/* Tabs */}
        <div className="mt-6 flex gap-3">
          <TabBtn value="buscar" icon="🔍" label="Buscar pela prova" />
          <TabBtn value="certificado" icon="📷" label="Importar certificado" />
          <TabBtn value="manual" icon="✏️" label="Preencher manualmente" />
        </div>

        {/* === MODO BUSCAR === */}
        {modo === "buscar" && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <form onSubmit={onBuscar} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">Qual a prova?</label>
                <select
                  value={buscaCorrida}
                  onChange={(e) => {
                    setBuscaCorrida(e.target.value);
                    setBuscaResultado(null);
                    setBuscaErro(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                >
                  <option value="">— Selecione uma prova do catálogo —</option>
                  {corridasBrasil.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo} ({new Date(c.data).getFullYear()}) · {c.cidade}/{c.uf}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Como buscar você?</label>
                <div className="mt-2 flex gap-3">
                  <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="ident"
                      value="cpf"
                      checked={buscaIdent === "cpf"}
                      onChange={() => setBuscaIdent("cpf")}
                    />
                    Pelo meu CPF (do perfil)
                  </label>
                  <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="ident"
                      value="bib"
                      checked={buscaIdent === "bib"}
                      onChange={() => setBuscaIdent("bib")}
                    />
                    Pelo número de peito
                  </label>
                </div>
              </div>

              {buscaIdent === "bib" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número de peito</label>
                  <input
                    value={buscaBib}
                    onChange={(e) => setBuscaBib(e.target.value)}
                    type="text"
                    placeholder="Ex.: 5421"
                    className={inputCls}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={buscando || !buscaCorrida}
                className="w-full rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {buscando ? "Buscando…" : "🔍 Buscar meu resultado"}
              </button>
            </form>

            {/* Resultado encontrado */}
            {buscaResultado && (
              <div className="mt-6 rounded-xl border-2 border-green-300 bg-green-50 p-5">
                <div className="flex items-center gap-2 text-green-900">
                  <span className="text-xl">✅</span>
                  <h3 className="font-semibold">Resultado encontrado!</h3>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Prova</p>
                    <p className="font-medium text-gray-900">{buscaResultado.raceName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Data</p>
                    <p className="font-medium text-gray-900">
                      {new Date(buscaResultado.raceDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Distância</p>
                    <p className="font-medium text-gray-900">{formatarDistancia(buscaResultado.distanceMeters)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Tempo líquido</p>
                    <p className="font-mono text-base font-bold text-orange-600">
                      {formatarTempo(buscaResultado.netTimeSeconds)}
                    </p>
                  </div>
                  {buscaResultado.generalRank && (
                    <div>
                      <p className="text-xs uppercase text-gray-500">Geral</p>
                      <p className="font-medium text-gray-900">{buscaResultado.generalRank}º</p>
                    </div>
                  )}
                  {buscaResultado.categoryName && (
                    <div>
                      <p className="text-xs uppercase text-gray-500">Categoria</p>
                      <p className="font-medium text-gray-900">
                        {buscaResultado.categoryName}
                        {buscaResultado.categoryRank ? ` · ${buscaResultado.categoryRank}º` : ""}
                      </p>
                    </div>
                  )}
                </div>
                {erro && (
                  <div className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</div>
                )}
                <button
                  type="button"
                  onClick={salvarResultadoBuscado}
                  disabled={salvando}
                  className="mt-4 w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {salvando ? "Salvando…" : "Salvar na minha página"}
                </button>
              </div>
            )}

            {/* Não encontrado */}
            {buscaErro && (
              <div className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
                <div className="flex items-center gap-2 text-amber-900">
                  <span className="text-xl">⚠️</span>
                  <h3 className="font-semibold">{buscaErro.msg}</h3>
                </div>
                {buscaErro.hint && <p className="mt-2 text-sm text-amber-800">{buscaErro.hint}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {buscaErro.siteOficial && (
                    <a
                      href={buscaErro.siteOficial}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
                    >
                      Ver no site oficial →
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setModo("certificado")}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                  >
                    📷 Importar certificado
                  </button>
                  <button
                    type="button"
                    onClick={() => setModo("manual")}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    ✏️ Preencher manualmente
                  </button>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs text-gray-500">
              💡 Hoje fazemos a busca em uma base parceira limitada. Em breve, integração direta com Latemp,
              Chronotrack e outros cronometristas.
            </p>
          </div>
        )}

        {/* === MODO CERTIFICADO === */}
        {modo === "certificado" && (
          <div className="mt-6 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-6">
            <div className="flex items-start gap-3">
              <div className="text-3xl">📷</div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-orange-900">Importar do certificado (foto ou PDF)</h2>
                <p className="mt-1 text-sm text-orange-800">
                  Envie uma foto ou PDF do seu certificado e a gente preenche os campos pra você. Você revisa antes de
                  salvar.
                </p>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={importando}
                    onChange={onUpload}
                  />
                  {importando ? "Lendo certificado…" : "Escolher arquivo"}
                </label>
                {importMsg && <p className="mt-3 text-sm font-medium text-green-700">✓ {importMsg}</p>}
                {erro && <p className="mt-3 text-sm font-medium text-red-700">{erro}</p>}
              </div>
            </div>
          </div>
        )}

        {/* === MODO MANUAL === */}
        {modo === "manual" && (
          <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{erro}</div>}
            {importMsg && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-green-200">
                ✓ {importMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Corrida do catálogo (opcional)</label>
              <select
                value={form.raceCatalogId}
                onChange={onCatalogChange}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              >
                <option value="">— Outra corrida (preencher manualmente) —</option>
                {corridasBrasil.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo} ({new Date(c.data).getFullYear()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nome da prova *</label>
              <input
                required
                value={form.raceName}
                onChange={set("raceName")}
                type="text"
                placeholder="Ex.: Meia Maratona do Recife 2025"
                className={inputCls}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Data *</label>
                <input required value={form.raceDate} onChange={set("raceDate")} type="date" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Distância *</label>
                <select
                  required
                  value={form.distancia}
                  onChange={set("distancia")}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {distanciasComuns.map((d) => (
                    <option key={d.metros} value={d.metros}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Cidade</label>
                <input value={form.raceCity} onChange={set("raceCity")} type="text" placeholder="Recife" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">UF</label>
                <input
                  value={form.raceUf}
                  onChange={set("raceUf")}
                  type="text"
                  maxLength={2}
                  placeholder="PE"
                  className={`${inputCls} uppercase`}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tempo líquido *</label>
                <input
                  required
                  value={form.tempo}
                  onChange={set("tempo")}
                  type="text"
                  placeholder="01:45:30"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-500">HH:MM:SS ou MM:SS</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Posição geral</label>
                <input
                  value={form.generalRank}
                  onChange={set("generalRank")}
                  type="number"
                  min={1}
                  placeholder="357"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                <input
                  value={form.categoryName}
                  onChange={set("categoryName")}
                  type="text"
                  placeholder="M30-34"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Link do certificado</label>
              <input
                value={form.certificateUrl}
                onChange={set("certificateUrl")}
                type="url"
                placeholder="https://..."
                className={inputCls}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => nav(-1)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {salvando ? "Salvando…" : "Salvar resultado"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
