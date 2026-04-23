import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Split = {
  checkpointId: string;
  kmMark: number;
  timestamp: string;
  splitDuration: number;
  paceSecondsPerKm: number;
  pace: string;
};

type Result = {
  event: { title: string; date: string; distanceMeters: number };
  generalRank: number | null;
  categoryRank: number | null;
  gunTime: string;
  netTime: string;
  splits: Split[];
};

const paceToMin = (seconds: number) => (seconds ? Number((seconds / 60).toFixed(2)) : 0);

export function RunnerResultPage() {
  const { registrationId } = useParams();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!registrationId) return;
    api.get<Result>(`/results/${registrationId}`).then((res) => setResult(res.data));
  }, [registrationId]);

  const chartData = useMemo(
    () =>
      (result?.splits ?? []).map((split) => ({
        km: split.kmMark,
        pace: paceToMin(split.paceSecondsPerKm),
      })),
    [result],
  );

  const downloadCertificate = async () => {
    if (!registrationId) return;
    const { data } = await api.get<{ url: string }>(`/results/${registrationId}/certificate`);
    window.open(data.url, "_blank");
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header area="runner" />
        <main className="mx-auto max-w-5xl p-6">Carregando resultado...</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="runner" />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <section className="rounded bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{result.event.title}</h1>
          <p className="text-sm text-gray-600">{new Date(result.event.date).toLocaleDateString("pt-BR")} • {result.event.distanceMeters / 1000}km</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border p-3">
              <p className="text-sm text-gray-500">Colocação geral</p>
              <p className="text-2xl font-bold text-orange-500">{result.generalRank ?? "-"}</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-sm text-gray-500">Colocação categoria</p>
              <p className="text-2xl font-bold text-orange-500">{result.categoryRank ?? "-"}</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-sm text-gray-500">Tempo bruto</p>
              <p className="text-xl font-semibold">{result.gunTime}</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-sm text-gray-500">Tempo líquido</p>
              <p className="text-xl font-semibold">{result.netTime}</p>
            </div>
          </div>

          <button onClick={downloadCertificate} className="mt-4 rounded bg-orange-500 px-4 py-2 text-white">
            Baixar certificado PDF
          </button>
        </section>

        <section className="rounded bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Splits por km</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">KM</th>
                  <th className="py-2">Tempo no checkpoint</th>
                  <th className="py-2">Duração do split</th>
                  <th className="py-2">Pace</th>
                </tr>
              </thead>
              <tbody>
                {result.splits.map((split) => (
                  <tr key={split.checkpointId} className="border-b">
                    <td className="py-2">{split.kmMark}</td>
                    <td className="py-2">{new Date(split.timestamp).toLocaleTimeString("pt-BR")}</td>
                    <td className="py-2">{split.splitDuration}s</td>
                    <td className="py-2">{split.pace}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Pace por km</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="km" />
                <YAxis unit="min" />
                <Tooltip />
                <Line type="monotone" dataKey="pace" stroke="#f97316" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>
    </div>
  );
}
