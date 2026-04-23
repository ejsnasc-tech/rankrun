import { useParams } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";

export function AdminBibsPage() {
  const { id } = useParams();

  const generate = async () => {
    await api.post(`/events/${id}/bibs/generate`);
    alert("Bibs gerados com sucesso.");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="admin" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold">Gerar bibs</h1>
        <div className="rounded bg-white p-6 shadow-sm">
          <button onClick={generate} className="rounded bg-orange-500 px-4 py-2 text-white">
            Gerar bibs sequenciais
          </button>
        </div>
      </main>
    </div>
  );
}
