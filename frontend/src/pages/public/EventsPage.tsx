import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../../components/Header";
import { api } from "../../services/api";

type EventItem = {
  id: string;
  title: string;
  slug: string;
  date: string;
  location: string;
  distanceMeters: number;
};

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<EventItem[]>("/events")
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="public" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold">Eventos</h1>
        {loading ? <p>Carregando eventos...</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="rounded bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">{event.title}</h2>
              <p className="text-sm text-gray-600">{new Date(event.date).toLocaleDateString("pt-BR")}</p>
              <p className="text-sm text-gray-600">{event.location}</p>
              <p className="text-sm text-gray-600">{event.distanceMeters / 1000} km</p>
              <Link to={`/eventos/${event.slug}`} className="mt-3 inline-block text-orange-500">
                Ver detalhes
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
