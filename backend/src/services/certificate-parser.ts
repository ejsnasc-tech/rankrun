/**
 * Extrai dados estruturados de um certificado de corrida a partir de texto bruto.
 * Heurísticas pensadas para o formato típico de certificados brasileiros:
 *   - "Maratona do Rio" / "Meia Maratona de XYZ"
 *   - Distâncias: 5K, 10K, 21K, 42K, 5km, 10km, 21,097m
 *   - Tempos: HH:MM:SS ou MM:SS
 *   - Datas: dd/mm/aaaa
 *   - Classificação geral: "geral" / "classificação" / "posição"
 */

export interface ExtractedResult {
  raceName?: string;
  raceDate?: string; // ISO yyyy-mm-dd
  raceCity?: string;
  raceUf?: string;
  distanceMeters?: number;
  netTimeSeconds?: number;
  generalRank?: number;
  categoryName?: string;
  categoryRank?: number;
  rawText: string;
  confidence: {
    raceName: boolean;
    raceDate: boolean;
    distanceMeters: boolean;
    netTimeSeconds: boolean;
  };
}

const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

function parseTimeToSeconds(s: string): number | undefined {
  const m = s.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (m) {
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  const m2 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m2) {
    return Number(m2[1]) * 60 + Number(m2[2]);
  }
  return undefined;
}

function parseDate(text: string): string | undefined {
  // dd/mm/yyyy ou dd-mm-yyyy
  const m = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return undefined;
}

function parseDistance(text: string): number | undefined {
  const lower = text.toLowerCase();
  // Casos especiais primeiro
  if (/\b(maratona|42[\.,]?195|42k|42km)\b/.test(lower) && !/meia/.test(lower)) {
    return 42195;
  }
  if (/\b(meia\s*maratona|21[\.,]?097|21k|21km)\b/.test(lower)) {
    return 21097;
  }
  // Genérico: NN km / NN k
  const m = lower.match(/\b(\d{1,3})\s*(?:km|k)\b/);
  if (m) {
    return Number(m[1]) * 1000;
  }
  const m2 = lower.match(/\b(\d{1,5})\s*m\b/);
  if (m2) {
    return Number(m2[1]);
  }
  return undefined;
}

function findRaceName(lines: string[]): string | undefined {
  // Heurística: linhas em CAIXA ALTA com 3+ palavras, ou que contenham "corrida"/"maratona"
  const candidates = lines
    .map((l) => l.trim())
    .filter((l) => l.length >= 8 && l.length <= 80)
    .filter((l) => /corrida|maratona|run|circuito|prova/i.test(l));
  if (candidates.length > 0) return candidates[0];
  // fallback: primeira linha bem grande
  const big = lines.find((l) => l.trim().length > 15 && l.trim().length < 60);
  return big?.trim();
}

function findCity(text: string): { city?: string; uf?: string } {
  // Procura "Cidade - UF" ou "Cidade/UF" — limitado a até 3 palavras antes do separador
  for (const uf of UF_LIST) {
    const re = new RegExp(
      `\\b((?:[A-ZÁÉÍÓÚÇÃÕÂÊÔ][a-záéíóúçãõâêô]+)(?:\\s+(?:de|da|do|dos|das|[A-ZÁÉÍÓÚÇÃÕÂÊÔ][a-záéíóúçãõâêô]+)){0,3})\\s*[-/]\\s*${uf}\\b`,
    );
    const m = text.match(re);
    if (m) return { city: m[1].trim().replace(/\s+/g, " "), uf };
  }
  return {};
}

function findRank(text: string): number | undefined {
  // "Geral: 1234" / "Classificação Geral 1234º" / "Posição 1234"
  const m = text.match(/(?:geral|classifica[cç][aã]o|posi[cç][aã]o)[\s:]+(\d{1,5})/i);
  if (m) return Number(m[1]);
  return undefined;
}

export function extractResultFromText(rawText: string): ExtractedResult {
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const fullText = rawText.replace(/\s+/g, " ");

  const raceName = findRaceName(lines);
  const raceDate = parseDate(fullText);
  const distanceMeters = parseDistance(fullText);
  const { city, uf } = findCity(fullText);

  // Tempo: pega o primeiro HH:MM:SS encontrado (geralmente é o tempo líquido)
  const timeMatches = fullText.match(/\d{1,2}:\d{2}:\d{2}/g) ?? [];
  const netTimeSeconds = timeMatches.length > 0 ? parseTimeToSeconds(timeMatches[0]) : undefined;

  const generalRank = findRank(fullText);

  return {
    raceName,
    raceDate,
    raceCity: city,
    raceUf: uf,
    distanceMeters,
    netTimeSeconds,
    generalRank,
    rawText,
    confidence: {
      raceName: !!raceName,
      raceDate: !!raceDate,
      distanceMeters: !!distanceMeters,
      netTimeSeconds: !!netTimeSeconds,
    },
  };
}
