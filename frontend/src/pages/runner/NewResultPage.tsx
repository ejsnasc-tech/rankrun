import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";
import { parseTempo } from "../../utils/format";
import { corridasBrasil } from "../../data/corridas-brasil";

const distanciasComuns = [
  { label: "5 km", metros: 5000 },
  { label: "10 km", metros: 10000 },
  { label: "Meia (21,097 km)", metros: 21097 },
  { label: "Maratona (42,195 km)", metros: 42195 },
];

export function NewResultPage() {
  const nav = useNavigate();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    const tempoStr = String(fd.get("tempo") || "");
    const netTimeSeconds = parseTempo(tempoStr);
    if (!netTimeSeconds) {
      setErro("Tempo inválido. Use o formato HH:MM:SS ou MM:SS.");
      return;
    }
    const distanceMeters = parseInt(String(fd.get("distancia") || "0"), 10);
    if (!distanceMeters) {
      setErro("Selecione a distância.");
      return;
    }

    const raceCatalogId = String(fd.get("raceCatalogId") || "");
    const corridaCat = corridasBrasil.find((c) => c.id === raceCatalogId);

    const payload: Record<string, unknown> = {
      raceName: String(fd.get("raceName") || corridaCat?.titulo || "").trim(),
      raceDate: String(fd.get("raceDate") || ""),
      raceCity: String(fd.get("raceCity") || corridaCat?.cidade || "").trim() || undefined,
      raceUf: String(fd.get("raceUf") || corridaCat?.uf || "").trim() || undefined,
      distanceMeters,
      netTimeSeconds,
      raceCatalogId: raceCatalogId || undefined,
    };
    const generalRank = String(fd.get("generalRank") || "");
    if (generalRank) payload.generalRank = parseInt(generalRank, 10);
    const categoryName = String(fd.get("categoryName") || "").trim();
    if (categoryName) payload.categoryName = categoryName;
    const certificateUrl = String(fd.get("certificateUrl") || "").trim();
    if (certificateUrl) payload.certificateUrl = certificateUrl;

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="runner" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Registrar resultado</h1>
        <p className="mt-1 text-sm text-gray-600">
          Adicione uma prova que você correu — pode ser do nosso catálogo ou de qualquer outra corrida.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          {erro ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{erro}</div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-700">Corrida do catálogo (opcional)</label>
            <select
              name="raceCatalogId"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              defaultValue=""
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
              name="raceName"
              type="text"
              placeholder="Ex.: Meia Maratona do Recife 2025"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data *</label>
              <input
                required
                name="raceDate"
                type="date"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Distância *</label>
              <select
                required
                name="distancia"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                defaultValue=""
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
              <input
                name="raceCity"
                type="text"
                placeholder="Recife"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">UF</label>
              <input
                name="raceUf"
                type="text"
                maxLength={2}
                placeholder="PE"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-orange-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tempo líquido *</label>
              <input
                required
                name="tempo"
                type="text"
                placeholder="01:45:30"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">HH:MM:SS ou MM:SS</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Posição geral</label>
              <input
                name="generalRank"
                type="number"
                min={1}
                placeholder="357"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Categoria</label>
              <input
                name="categoryName"
                type="text"
                placeholder="M30-34"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Link do certificado</label>
            <input
              name="certificateUrl"
              type="url"
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
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
