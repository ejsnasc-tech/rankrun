import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";

type EventData = {
  id: string;
  title: string;
  slug: string;
  date: string;
  location: string;
  description: string;
  categories: Array<{ id: string; name: string; price: string }>;
};

export function EventDetailsPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState<EventData | null>(null);

  useEffect(() => {
    api.get<EventData[]>("/events").then((res) => {
      const found = res.data.find((item) => item.slug === slug);
      if (found) {
        api.get<EventData>(`/events/${found.id}`).then((details) => setEvent(details.data));
      }
    });
  }, [slug]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="public" />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {!event ? (
          <p>Carregando detalhes...</p>
        ) : (
          <div className="rounded bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <p className="mt-1 text-gray-600">{event.location}</p>
            <p className="text-gray-600">{new Date(event.date).toLocaleDateString("pt-BR")}</p>
            <p className="mt-4 text-gray-700">{event.description}</p>
            <h2 className="mt-6 text-lg font-semibold">Categorias</h2>
            <ul className="mt-2 space-y-2">
              {event.categories.map((category) => (
                <li key={category.id} className="rounded border p-3 text-sm">
                  {category.name} - R$ {Number(category.price).toFixed(2)}
                </li>
              ))}
            </ul>
            <Link to="/app/minhas-provas" className="mt-6 inline-block rounded bg-orange-500 px-4 py-2 text-white">
              Inscrever-se
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
