// Catálogo curado de corridas de rua brasileiras tradicionais.
// Usado como fallback quando o backend não tem eventos publicados ainda.
// Datas são estimativas baseadas no calendário típico de cada prova; confirme
// sempre no site oficial do organizador antes de se inscrever.

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
  },
];

export function ordenarPorData(lista: CorridaCatalogo[]): CorridaCatalogo[] {
  return [...lista].sort((a, b) => a.data.localeCompare(b.data));
}

export function filtrarAbertas(lista: CorridaCatalogo[]): CorridaCatalogo[] {
  return lista.filter((c) => c.status === "abertas" || c.status === "em-breve");
}
