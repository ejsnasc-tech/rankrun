import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";
import { socket } from "../../services/socket";

type ResultRow = {
  registrationId: string;
  atleta: string;
  bibNumber: number;
  netTime: string;
  generalRank: number | null;
  categoryRank: number | null;
  status: string;
};

export function AdminLivePanelPage() {
  const { id } = useParams();
  const [rows, setRows] = useState<ResultRow[]>([]);

  const refresh = () => {
    if (!id) return;
    api.get(`/events/${id}/results`).then((res) => setRows(res.data.general));
  };

  useEffect(() => {
    if (!id) return;

    refresh();
    socket.connect();
    socket.emit("join:event", id);
    socket.on("timing:update", refresh);

    return () => {
      socket.off("timing:update", refresh);
      socket.disconnect();
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="admin" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold">Painel ao vivo</h1>
        <div className="overflow-x-auto rounded bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Posição</th>
                <th className="p-3">Atleta</th>
                <th className="p-3">Bib</th>
                <th className="p-3">Tempo líquido</th>
                <th className="p-3">Cat.</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.registrationId} className="border-b">
                  <td className="p-3">{row.generalRank ?? "-"}</td>
                  <td className="p-3">{row.atleta}</td>
                  <td className="p-3">{row.bibNumber ?? "-"}</td>
                  <td className="p-3">{row.netTime}</td>
                  <td className="p-3">{row.categoryRank ?? "-"}</td>
                  <td className="p-3">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
