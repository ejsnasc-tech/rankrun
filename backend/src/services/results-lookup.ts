/**
 * Mock de "resultados oficiais" — simula uma base centralizada de resultados
 * de provas (no futuro, substituível por scrapers de Latemp/Chronotrack/Ative
 * ou integrações via API com cronometristas).
 *
 * Indexado por raceCatalogId (slug do catálogo) + identificador do atleta
 * (CPF apenas dígitos OU número de peito como string).
 */

export interface MockResult {
  raceCatalogId: string;
  raceName: string;
  raceDate: string; // ISO
  raceCity: string;
  raceUf: string;
  distanceMeters: number;
  netTimeSeconds: number;
  grossTimeSeconds?: number;
  generalRank?: number;
  categoryName?: string;
  categoryRank?: number;
  certificateUrl?: string;
}

interface MockEntry extends MockResult {
  cpf?: string; // apenas dígitos
  bib?: string;
}

// Banco mock (algumas provas + o usuário seed corredor@teste.com cpf 11111111111)
const RESULTS: MockEntry[] = [
  {
    raceCatalogId: "maratona-rio-2026",
    raceName: "Maratona do Rio",
    raceDate: "2026-06-14",
    raceCity: "Rio de Janeiro",
    raceUf: "RJ",
    distanceMeters: 42195,
    netTimeSeconds: 3 * 3600 + 45 * 60 + 22,
    grossTimeSeconds: 3 * 3600 + 47 * 60 + 0,
    generalRank: 892,
    categoryName: "M30-34",
    categoryRank: 87,
    cpf: "11111111111",
    bib: "5421",
  },
  {
    raceCatalogId: "meia-itabaiana-2026",
    raceName: "Meia Maratona de Itabaiana",
    raceDate: "2026-08-09",
    raceCity: "Itabaiana",
    raceUf: "SE",
    distanceMeters: 21097,
    netTimeSeconds: 1 * 3600 + 48 * 60 + 12,
    generalRank: 34,
    categoryName: "M30-34",
    categoryRank: 6,
    cpf: "11111111111",
    bib: "112",
  },
  {
    raceCatalogId: "circuito-caixa-aracaju-2026",
    raceName: "Circuito das Estações - Etapa Aracaju",
    raceDate: "2026-04-12",
    raceCity: "Aracaju",
    raceUf: "SE",
    distanceMeters: 10000,
    netTimeSeconds: 49 * 60 + 33,
    generalRank: 78,
    categoryName: "M30-34",
    categoryRank: 12,
    cpf: "11111111111",
    bib: "303",
  },
];

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function lookupResult(raceCatalogId: string, identifier: { cpf?: string; bib?: string }): MockResult | null {
  const cpfDigits = identifier.cpf ? onlyDigits(identifier.cpf) : undefined;
  const bib = identifier.bib?.trim();

  const match = RESULTS.find((r) => {
    if (r.raceCatalogId !== raceCatalogId) return false;
    if (cpfDigits && r.cpf === cpfDigits) return true;
    if (bib && r.bib === bib) return true;
    return false;
  });

  if (!match) return null;
  // Strip identifiers before returning
  const { cpf: _c, bib: _b, ...result } = match;
  return result;
}
