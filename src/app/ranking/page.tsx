import { getDB, formatTempo, distanciaLabel } from "@/lib/db";
export const dynamic = "force-dynamic";

const UFs = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const DISTANCIAS = [{ label: "5K", v: 5000 }, { label: "10K", v: 10000 }, { label: "Meia", v: 21097 }, { label: "Maratona", v: 42195 }];

export default async function RankingPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const distancia = params.distancia ? Number(params.distancia) : null;
  const uf = params.uf || null;
  const busca = params.q || null;
  const sexo = params.sexo || null;

  const db = await getDB();

  let query = `
    SELECT r.atleta_nome, r.atleta_cidade, r.atleta_uf, r.categoria,
           MIN(r.tempo_liquido_seg) as melhor_tempo,
           COUNT(*) as total_provas,
           p.distancia_metros
    FROM resultados r
    JOIN provas p ON p.id = r.prova_id
    WHERE 1=1
  `;
  const binds: (string | number)[] = [];

  if (distancia) { query += " AND p.distancia_metros = ?"; binds.push(distancia); }
  if (uf) { query += " AND r.atleta_uf = ?"; binds.push(uf); }
  if (busca) { query += " AND r.atleta_nome LIKE ?"; binds.push(`%${busca}%`); }
  if (sexo === "M") { query += " AND (r.categoria LIKE 'M-%' OR r.categoria LIKE 'M %' OR r.categoria LIKE '%MASCULINO%')"; }
  if (sexo === "F") { query += " AND (r.categoria LIKE 'F-%' OR r.categoria LIKE 'F %' OR r.categoria LIKE '%FEMININO%')"; }

  query += " GROUP BY r.atleta_nome, r.atleta_cidade, r.atleta_uf, p.distancia_metros ORDER BY melhor_tempo ASC LIMIT 100";

  const { results } = await db.prepare(query).bind(...binds).all<{
    atleta_nome: string; atleta_cidade: string | null; atleta_uf: string | null;
    categoria: string | null; melhor_tempo: number; total_provas: number; distancia_metros: number;
  }>();

  const titulo = [
    uf ? `${uf}` : "Brasil",
    distancia ? distanciaLabel(distancia) : "Todas as distâncias",
    sexo === "M" ? "Masculino" : sexo === "F" ? "Feminino" : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ranking — {titulo}</h1>
        <p className="text-slate-500 text-sm mt-1">{results.length} corredores encontrados</p>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-3">
        <input name="q" defaultValue={busca || ""} placeholder="Buscar por nome..." className="border border-slate-200 rounded-lg px-4 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:border-orange-400" />
        <select name="distancia" defaultValue={distancia || ""} className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-400">
          <option value="">Todas as distâncias</option>
          {DISTANCIAS.map(d => <option key={d.v} value={d.v}>{d.label}</option>)}
        </select>
        <select name="uf" defaultValue={uf || ""} className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-400">
          <option value="">Todo o Brasil</option>
          {UFs.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select name="sexo" defaultValue={sexo || ""} className="border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-400">
          <option value="">Masculino e Feminino</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
        <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
          Filtrar
        </button>
      </form>

      {/* Tabela */}
      {results.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          Nenhum resultado encontrado. Os dados são importados pela equipe RankRun após cada prova.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-12">#</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Atleta</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Local</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Distância</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Melhor tempo</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Provas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-orange-500">{i + 1}º</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{r.atleta_nome}</td>
                  <td className="px-4 py-3 text-slate-500">{[r.atleta_cidade, r.atleta_uf].filter(Boolean).join("/")}</td>
                  <td className="px-4 py-3 text-slate-500">{r.categoria || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{distanciaLabel(r.distancia_metros)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{formatTempo(r.melhor_tempo)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{r.total_provas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
