import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";

type Registration = {
  id: string;
  status: string;
  bibNumber: number | null;
  event: { title: string; date: string };
  category: { name: string };
};

export function MyRacesPage() {
  const [items, setItems] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Registration[]>("/registrations/me")
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="runner" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold">Minhas provas</h1>
        {loading ? <p>Carregando inscrições...</p> : null}
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">{item.event.title}</h2>
              <p className="text-sm text-gray-600">{new Date(item.event.date).toLocaleDateString("pt-BR")}</p>
              <p className="text-sm text-gray-600">Categoria: {item.category.name}</p>
              <p className="text-sm text-gray-600">Status: {item.status}</p>
              <p className="text-sm text-gray-600">Bib: {item.bibNumber ?? "Aguardando"}</p>
              <Link to={`/app/provas/${item.id}`} className="mt-2 inline-block text-orange-500">
                Ver resultado
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
