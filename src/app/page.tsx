import Link from "next/link";

const DISTANCIAS = [
  { label: "5K", metros: 5000 },
  { label: "10K", metros: 10000 },
  { label: "Meia", metros: 21097 },
  { label: "Maratona", metros: 42195 },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
          O ranking de corridas de rua<br />
          <span className="text-orange-500">de todo o Brasil</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto">
          Resultados de provas em todo o país. Compare seu tempo, veja os melhores por distância, cidade e estado.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link href="/ranking" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            Ver ranking nacional
          </Link>
          <Link href="/provas" className="border border-orange-500 text-orange-500 hover:bg-orange-50 font-semibold px-6 py-3 rounded-lg transition-colors">
            Calendário de provas
          </Link>
        </div>
      </section>

      {/* Distâncias */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Ranking por distância</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {DISTANCIAS.map((d) => (
            <Link
              key={d.metros}
              href={`/ranking?distancia=${d.metros}`}
              className="bg-white border border-slate-200 rounded-xl p-6 text-center hover:border-orange-400 hover:shadow-md transition-all group"
            >
              <div className="text-3xl font-extrabold text-orange-500 group-hover:scale-110 transition-transform">{d.label}</div>
              <div className="text-sm text-slate-500 mt-1">Ver ranking</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Estados */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Ranking por estado</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
          {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map((uf) => (
            <Link
              key={uf}
              href={`/ranking?uf=${uf}`}
              className="bg-white border border-slate-200 rounded-lg py-2 text-center text-sm font-semibold text-slate-700 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
            >
              {uf}
            </Link>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Como funciona</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "🏅", title: "Resultados oficiais", desc: "Importamos os tempos diretamente dos sites das provas, sem alterar nada." },
            { icon: "📊", title: "Ranking automático", desc: "Classificamos por cidade, estado e Brasil em cada distância." },
            { icon: "🔍", title: "Busca por nome", desc: "Encontre os resultados de qualquer corredor pelo nome." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <span className="text-3xl">{item.icon}</span>
              <div>
                <h3 className="font-semibold text-slate-800">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
