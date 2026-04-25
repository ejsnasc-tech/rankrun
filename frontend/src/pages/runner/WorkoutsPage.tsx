import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";

type Workout = {
  id: string;
  source: "MANUAL" | "STRAVA" | "GARMIN" | string;
  type: "RUN" | "RIDE" | "SWIM" | "WALK" | "OTHER" | string;
  name: string | null;
  startedAt: string;
  distanceMeters: number;
  movingSeconds: number;
  elevationGain: number | null;
  notes: string | null;
};

type StravaStatus = {
  connected: boolean;
  athleteId: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  mockMode: boolean;
};

type Stats = { last30Days: { workouts: number; km: number; hours: number } };

const formatPace = (sec: number, m: number) => {
  if (!m) return "—";
  const pace = sec / (m / 1000);
  const mm = Math.floor(pace / 60);
  const ss = Math.round(pace % 60).toString().padStart(2, "0");
  return `${mm}:${ss}/km`;
};

const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}:${s.toString().padStart(2, "0")}`;
};

const typeIcon: Record<string, string> = { RUN: "🏃", RIDE: "🚴", SWIM: "🏊", WALK: "🚶", OTHER: "🏋️" };

export function WorkoutsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [strava, setStrava] = useState<StravaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "RUN",
    name: "",
    startedAt: new Date().toISOString().slice(0, 16),
    distanceKm: "",
    durationMin: "",
    notes: "",
  });

  const reload = async () => {
    const [w, s, st] = await Promise.all([
      api.get<Workout[]>("/me/workouts"),
      api.get<Stats>("/me/workouts/stats"),
      api.get<StravaStatus>("/me/strava/status"),
    ]);
    setWorkouts(w.data);
    setStats(s.data);
    setStrava(st.data);
  };

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const flag = searchParams.get("strava");
    if (flag === "ok") setMsg("✓ Conectado ao Strava com sucesso!");
    else if (flag === "mock") setMsg("✓ Conectado em modo demo (configure STRAVA_CLIENT_ID para conexão real).");
    else if (flag === "error") setMsg("Falha ao conectar com o Strava.");
    if (flag) {
      const next = new URLSearchParams(searchParams);
      next.delete("strava");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const conectarStrava = async () => {
    setMsg(null);
    const { data } = await api.post<{ authorizeUrl?: string; mockMode?: boolean }>("/me/strava/connect");
    if (data.authorizeUrl) {
      window.location.href = data.authorizeUrl;
    } else if (data.mockMode) {
      setMsg("✓ Conectado em modo demo.");
      await reload();
    }
  };

  const desconectarStrava = async () => {
    await api.post("/me/strava/disconnect");
    await reload();
  };

  const sincronizar = async () => {
    setSyncing(true);
    setMsg(null);
    try {
      const { data } = await api.post<{ imported: number; mockMode: boolean }>("/me/strava/sync");
      setMsg(`✓ ${data.imported} treino(s) importado(s)${data.mockMode ? " (demo)" : ""}.`);
      await reload();
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? "Erro ao sincronizar.");
    } finally {
      setSyncing(false);
    }
  };

  const submitManual = async (e: FormEvent) => {
    e.preventDefault();
    const km = parseFloat(form.distanceKm.replace(",", "."));
    const min = parseFloat(form.durationMin.replace(",", "."));
    if (!km || !min) {
      setMsg("Distância e duração obrigatórios.");
      return;
    }
    await api.post("/me/workouts", {
      type: form.type,
      name: form.name || undefined,
      startedAt: new Date(form.startedAt).toISOString(),
      distanceMeters: Math.round(km * 1000),
      movingSeconds: Math.round(min * 60),
      notes: form.notes || undefined,
    });
    setShowForm(false);
    setForm({ ...form, name: "", distanceKm: "", durationMin: "", notes: "" });
    await reload();
    setMsg("✓ Treino registrado.");
  };

  const remover = async (id: string) => {
    if (!confirm("Remover treino?")) return;
    await api.delete(`/me/workouts/${id}`);
    await reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header area="runner" />
        <main className="mx-auto max-w-4xl px-4 py-8 text-gray-500">Carregando…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="runner" />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Meus treinos</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            {showForm ? "Cancelar" : "+ Adicionar treino"}
          </button>
        </div>

        {msg && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-200">
            {msg}
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs uppercase text-gray-500">Treinos (30d)</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats?.last30Days.workouts ?? 0}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs uppercase text-gray-500">KM (30d)</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats?.last30Days.km ?? 0}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs uppercase text-gray-500">Horas (30d)</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats?.last30Days.hours ?? 0}</p>
          </div>
        </section>

        {/* Strava */}
        <section className="rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 p-5 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-orange-100">Integração</p>
              <h2 className="text-lg font-semibold">Strava {strava?.mockMode ? "(modo demo)" : ""}</h2>
              {strava?.connected ? (
                <p className="mt-1 text-sm text-orange-50">
                  Conectado{strava.lastSyncAt ? ` · última sync ${new Date(strava.lastSyncAt).toLocaleString("pt-BR")}` : ""}
                </p>
              ) : (
                <p className="mt-1 text-sm text-orange-50">
                  Conecte sua conta para importar atividades automaticamente.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {strava?.connected ? (
                <>
                  <button
                    onClick={sincronizar}
                    disabled={syncing}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-60"
                  >
                    {syncing ? "Sincronizando…" : "🔄 Sincronizar"}
                  </button>
                  <button
                    onClick={desconectarStrava}
                    className="rounded-lg border border-white/40 px-3 py-2 text-xs text-white hover:bg-white/10"
                  >
                    Desconectar
                  </button>
                </>
              ) : (
                <button
                  onClick={conectarStrava}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50"
                >
                  Conectar com Strava
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Form manual */}
        {showForm && (
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Novo treino</h3>
            <form onSubmit={submitManual} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Tipo
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="RUN">🏃 Corrida</option>
                  <option value="RIDE">🚴 Pedal</option>
                  <option value="WALK">🚶 Caminhada</option>
                  <option value="SWIM">🏊 Natação</option>
                  <option value="OTHER">🏋️ Outro</option>
                </select>
              </label>
              <label className="text-sm">
                Nome (opcional)
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                Início
                <input
                  type="datetime-local"
                  value={form.startedAt}
                  onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                Distância (km)
                <input
                  value={form.distanceKm}
                  onChange={(e) => setForm({ ...form, distanceKm: e.target.value })}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm">
                Duração (min)
                <input
                  value={form.durationMin}
                  onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Notas
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="sm:col-span-2">
                <button className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600">
                  Salvar
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Lista */}
        <section className="rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          {workouts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Nenhum treino ainda. Adicione manualmente ou conecte ao Strava.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {workouts.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{typeIcon[w.type] ?? "🏃"}</span>
                      <p className="truncate text-sm font-medium text-gray-900">
                        {w.name || (w.type === "RUN" ? "Corrida" : w.type)}
                      </p>
                      {w.source === "STRAVA" && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                          Strava
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(w.startedAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-gray-900">{(w.distanceMeters / 1000).toFixed(2)} km</p>
                    <p className="text-xs text-gray-500">
                      {formatDuration(w.movingSeconds)} · {formatPace(w.movingSeconds, w.distanceMeters)}
                    </p>
                  </div>
                  <button
                    onClick={() => remover(w.id)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
