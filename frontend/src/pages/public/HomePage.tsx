import { Link } from "react-router-dom";
import { Header } from "../../components/Header";

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="public" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Gerencie corridas de rua com simplicidade</h1>
          <p className="mt-3 text-gray-600">
            Área da empresa para organizar eventos e área do corredor para acompanhar colocação, tempo bruto/líquido e marcas por km.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/eventos" className="rounded bg-orange-500 px-4 py-2 text-white">
              Ver eventos
            </Link>
            <Link to="/registro" className="rounded border border-orange-500 px-4 py-2 text-orange-500">
              Criar conta
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
