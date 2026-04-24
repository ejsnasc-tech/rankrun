import { useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";
import { parseTempo, formatarTempo } from "../../utils/format";
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

function snapToBucket(meters: number): string {
  const buckets = [5000, 10000, 21097, 42195];
  const closest = buckets.reduce((a, b) => (Math.abs(b - meters) < Math.abs(a - meters) ? b : a));
  if (Math.abs(closest - meters) <= 500) return String(closest);
  return String(meters);
}

export function NewResultPage() {
  const nav = useNavigate();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);

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
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Falha ao importar.")
          : "Falha ao importar.";
      setErro(msg);
    } finally {
      setImportando(false);
      e.target.value = "";
    }
  };

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
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Erro ao salvar.")
          : "Erro ao salvar.";
      setErro(msg);
      setSalvando(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="runner" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Registrar resultado</h1>
        <p className="mt-1 text-sm text-gray-600">
          Adicione uma prova que você correu — pode ser do nosso catálogo ou de qualquer outra corrida.
        </p>

        {/* Upload de certificado */}
        <div className="mt-6 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📷</div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-orange-900">
                Importar do certificado (foto ou PDF)
              </h2>
              <p className="mt-1 text-xs text-orange-800">
                Envie uma foto ou PDF do seu certificado e a gente preenche os campos pra você. Você revisa antes de salvar.
              </p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  disabled={importando}
                  onChange={onUpload}
                />
                {importando ? "Lendo certificado…" : "Escolher arquivo"}
              </label>
              {importMsg ? (
                <p className="mt-2 text-xs font-medium text-green-700">✓ {importMsg}</p>
              ) : null}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          {erro ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{erro}</div>
          ) : null}

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
              <input
                required
                value={form.raceDate}
                onChange={set("raceDate")}
                type="date"
                className={inputCls}
              />
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
      </main>
    </div>
  );
}
