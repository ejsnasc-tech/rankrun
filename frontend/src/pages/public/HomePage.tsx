import { Link } from "react-router-dom";
import { Header } from "../../components/Header";
import { CorridaCard } from "../../components/CorridaCard";
import { corridasBrasil, ordenarPorData } from "../../data/corridas-brasil";

export function HomePage() {
  const destaques = ordenarPorData(
    corridasBrasil.filter((c) => c.status !== "encerradas"),
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header area="public" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Gerencie corridas de rua com simplicidade</h1>
          <p className="mt-3 text-gray-600">
            Plataforma para corredores acompanharem suas provas e para empresas organizarem eventos com inscrição,
            cronometragem e relatórios.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/eventos" className="rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600">
              Ver eventos
            </Link>
            <Link to="/registro" className="rounded border border-orange-500 px-4 py-2 text-orange-500 hover:bg-orange-50">
              Criar conta
            </Link>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
                Calendário nacional
              </p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                Próximas corridas no Brasil
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Inscrições abertas e provas em breve em todo o país.
              </p>
            </div>
            <Link
              to="/eventos"
              className="hidden text-sm font-medium text-orange-600 hover:text-orange-700 sm:inline"
            >
              Ver todas →
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {destaques.map((c) => (
              <CorridaCard key={c.id} corrida={c} />
            ))}
          </div>

          <div className="mt-4 text-center sm:hidden">
            <Link to="/eventos" className="text-sm font-medium text-orange-600">
              Ver todas as corridas →
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <article className="flex flex-col rounded-lg border border-orange-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600">Para corredores</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">Sou corredor</h2>
            <p className="mt-2 flex-1 text-sm text-gray-600">
              Inscreva-se em provas, acompanhe sua colocação geral e por categoria, tempo bruto/líquido,
              splits por km e baixe seu certificado.
            </p>
            <div className="mt-4 flex gap-2">
              <Link to="/login" className="rounded bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600">
                Entrar
              </Link>
              <Link to="/registro" className="rounded border border-orange-500 px-4 py-2 text-sm text-orange-500 hover:bg-orange-50">
                Criar conta
              </Link>
            </div>
          </article>

          <article className="flex flex-col rounded-lg border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-400">Para organizadores</p>
            <h2 className="mt-1 text-xl font-semibold">Sou organizador</h2>
            <p className="mt-2 flex-1 text-sm text-slate-300">
              Gerencie eventos, categorias, inscrições, bibs, check-in, painel ao vivo da prova e relatórios financeiros.
            </p>
            <div className="mt-4">
              <Link
                to="/admin/login"
                className="inline-block rounded bg-orange-400 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-orange-300"
              >
                Acessar área da empresa
              </Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
