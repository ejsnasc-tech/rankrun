import type { CorridaCatalogo, StatusInscricao } from "../data/corridas-brasil";

const statusLabels: Record<StatusInscricao, { texto: string; cor: string }> = {
  abertas: { texto: "Inscrições abertas", cor: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  "em-breve": { texto: "Em breve", cor: "bg-amber-100 text-amber-700 ring-amber-200" },
  encerradas: { texto: "Encerradas", cor: "bg-gray-100 text-gray-600 ring-gray-200" },
};

const meses = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return { dia, mes: meses[mes - 1], ano };
}

export function CorridaCard({ corrida }: { corrida: CorridaCatalogo }) {
  const { dia, mes, ano } = formatarData(corrida.data);
  const status = statusLabels[corrida.status];
  const podeInscrever = corrida.status === "abertas";
  const ctaLabel = podeInscrever
    ? "Ir para inscrição →"
    : corrida.status === "em-breve"
      ? "Ver site oficial →"
      : "Edição encerrada";

  return (
    <a
      href={corrida.linkOficial}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 flex-col items-center justify-center rounded-lg bg-orange-50 text-orange-600">
          <span className="text-xs font-semibold uppercase">{mes}</span>
          <span className="text-2xl font-bold leading-none">{dia}</span>
          <span className="text-[10px] text-orange-500">{ano}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold leading-tight text-gray-900 group-hover:text-orange-600">
            {corrida.titulo}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {corrida.cidade}
            {corrida.uf ? ` · ${corrida.uf}` : ""}
            {corrida.pais && corrida.pais !== "BR" ? ` · ${corrida.pais}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {corrida.distancias.map((d) => (
          <span
            key={d}
            className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status.cor}`}
        >
          {status.texto}
        </span>
        <span className="text-xs text-gray-500">{corrida.organizador}</span>
      </div>

      {corrida.observacao ? (
        <p className="mt-2 text-xs text-gray-500">{corrida.observacao}</p>
      ) : null}

      <p
        className={`mt-3 text-sm font-medium ${
          podeInscrever
            ? "text-orange-600 group-hover:text-orange-700"
            : corrida.status === "em-breve"
              ? "text-amber-700"
              : "text-gray-400"
        }`}
      >
        {ctaLabel}
      </p>
    </a>
  );
}
