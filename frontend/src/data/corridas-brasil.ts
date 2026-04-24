// Catálogo curado de corridas de rua brasileiras tradicionais.
// Usado como fallback quando o backend não tem eventos publicados ainda.
//
// IMPORTANTE: As provas são reais e tradicionais (acontecem todo ano), mas
// as DATAS de 2026 são ESTIMADAS com base no calendário típico de cada
// edição. O `linkOficial` aponta sempre para o site oficial do organizador
// (mais estável que uma URL específica de inscrição que muda a cada edição).
// Confirme sempre data e abertura de inscrição no site oficial.

export type StatusInscricao = "abertas" | "em-breve" | "encerradas";

export type CorridaCatalogo = {
  id: string;
  titulo: string;
  cidade: string;
  uf: string;
  data: string; // ISO yyyy-mm-dd (estimada)
  distancias: string[]; // ex: ["5 km", "10 km", "21 km"]
  organizador: string;
  status: StatusInscricao;
  linkOficial: string;
  destaque?: boolean;
  observacao?: string;
};

export const corridasBrasil: CorridaCatalogo[] = [
  {
    id: "sao-silvestre-2026",
    titulo: "Corrida Internacional de São Silvestre",
    cidade: "São Paulo",
    uf: "SP",
    data: "2026-12-31",
    distancias: ["15 km"],
    organizador: "Yescom / Gazeta Esportiva",
    status: "em-breve",
    destaque: true,
    linkOficial: "https://www.saosilvestre.com.br/",
    observacao: "Inscrições abrem normalmente em meados do ano.",
  },
  {
    id: "maratona-sp-2026",
    titulo: "Maratona Internacional de São Paulo",
    cidade: "São Paulo",
    uf: "SP",
    data: "2026-06-21",
    distancias: ["6 km", "21 km", "42 km"],
    organizador: "Yescom",
    status: "abertas",
    destaque: true,
    linkOficial: "https://www.maratonadesaopaulo.com.br/",
  },
  {
    id: "maratona-rio-2026",
    titulo: "Maratona do Rio",
    cidade: "Rio de Janeiro",
    uf: "RJ",
    data: "2026-06-14",
    distancias: ["5 km", "10 km", "21 km", "42 km"],
    organizador: "Spiridon",
    status: "abertas",
    destaque: true,
    linkOficial: "https://www.maratonadorio.com.br/",
  },
  {
    id: "meia-floripa-2026",
    titulo: "Meia Maratona Internacional de Floripa",
    cidade: "Florianópolis",
    uf: "SC",
    data: "2026-05-17",
    distancias: ["6 km", "12 km", "21 km"],
    organizador: "Unimed Floripa",
    status: "abertas",
    linkOficial: "https://www.meiamaratonadefloripa.com.br/",
  },
  {
    id: "volta-pampulha-2026",
    titulo: "Volta Internacional da Pampulha",
    cidade: "Belo Horizonte",
    uf: "MG",
    data: "2026-12-13",
    distancias: ["18 km"],
    organizador: "Prefeitura de BH",
    status: "em-breve",
    linkOficial: "https://www.voltadapampulha.com.br/",
  },
  {
    id: "maratona-poa-2026",
    titulo: "Maratona Internacional de Porto Alegre",
    cidade: "Porto Alegre",
    uf: "RS",
    data: "2026-05-31",
    distancias: ["5 km", "10 km", "21 km", "42 km"],
    organizador: "Federação Gaúcha",
    status: "abertas",
    linkOficial: "https://www.maratonadeportoalegre.com.br/",
  },
  {
    id: "circuito-caixa-aracaju-2026",
    titulo: "Circuito das Estações - Etapa Aracaju",
    cidade: "Aracaju",
    uf: "SE",
    data: "2026-09-06",
    distancias: ["5 km", "10 km"],
    organizador: "Track&Field",
    status: "em-breve",
    destaque: true,
    linkOficial: "https://www.tfsports.com.br/circuito-das-estacoes",
  },
  {
    id: "corrida-cidade-aracaju-2026",
    titulo: "Corrida Cidade de Aracaju",
    cidade: "Aracaju",
    uf: "SE",
    data: "2026-03-15",
    distancias: ["5 km", "10 km"],
    organizador: "Prefeitura de Aracaju",
    status: "encerradas",
    linkOficial: "https://www.aracaju.se.gov.br/",
  },
  {
    id: "meia-itabaiana-2026",
    titulo: "Meia Maratona de Itabaiana",
    cidade: "Itabaiana",
    uf: "SE",
    data: "2026-08-23",
    distancias: ["5 km", "10 km", "21 km"],
    organizador: "FASE",
    status: "abertas",
    linkOficial: "https://www.minhasinscricoes.com.br/",
    observacao: "Inscrições normalmente via Minhas Inscrições.",
  },
  {
    id: "circuito-salvador-2026",
    titulo: "Circuito das Estações - Etapa Salvador",
    cidade: "Salvador",
    uf: "BA",
    data: "2026-07-19",
    distancias: ["5 km", "10 km"],
    organizador: "Track&Field",
    status: "abertas",
    linkOficial: "https://www.tfsports.com.br/circuito-das-estacoes",
  },
  {
    id: "maratona-fortaleza-2026",
    titulo: "Maratona Internacional de Fortaleza",
    cidade: "Fortaleza",
    uf: "CE",
    data: "2026-09-27",
    distancias: ["5 km", "10 km", "21 km", "42 km"],
    organizador: "Setur Ceará",
    status: "em-breve",
    linkOficial: "https://www.maratonadefortaleza.com.br/",
  },
  {
    id: "meia-recife-2026",
    titulo: "Meia Maratona do Recife",
    cidade: "Recife",
    uf: "PE",
    data: "2026-07-12",
    distancias: ["5 km", "10 km", "21 km"],
    organizador: "Prefeitura do Recife",
    status: "abertas",
    linkOficial: "https://www2.recife.pe.gov.br/",
  },
];

export function ordenarPorData(lista: CorridaCatalogo[]): CorridaCatalogo[] {
  return [...lista].sort((a, b) => a.data.localeCompare(b.data));
}

export function filtrarAbertas(lista: CorridaCatalogo[]): CorridaCatalogo[] {
  return lista.filter((c) => c.status === "abertas" || c.status === "em-breve");
}
