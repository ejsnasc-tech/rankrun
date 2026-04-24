/**
 * Scraper "best-effort" para resultados em sites públicos de cronometristas.
 *
 * Status atual: implementação genérica via fetch + regex. Cronometristas
 * brasileiros (Latemp, Chronotrack, ChipBrasil, R10) têm endpoints públicos
 * de resultados mas:
 *  - alguns exigem POST com cookies de sessão
 *  - layouts variam por evento
 *  - alguns retornam HTML server-rendered, outros fazem fetch JSON via JS
 *
 * Estratégia: registrar "providers" por raceCatalogId. Cada provider conhece
 * o endpoint específico daquela prova e como extrair o resultado de um atleta.
 *
 * Por ora apenas o esqueleto e um exemplo (Latemp) que realmente faz HTTP
 * mas cai num placeholder se algo mudar — assim o sistema nunca quebra.
 */

export interface ScrapedResult {
  raceCatalogId: string;
  raceName: string;
  raceDate: string;
  raceCity: string;
  raceUf: string;
  distanceMeters: number;
  netTimeSeconds: number;
  grossTimeSeconds?: number;
  generalRank?: number;
  categoryName?: string;
  categoryRank?: number;
  source: "latemp" | "chronotrack" | "chipbrasil" | "r10" | "manual";
}

export interface ScrapeIdentifier {
  cpf?: string;
  bib?: string;
  name?: string;
}

interface ProviderConfig {
  raceCatalogId: string;
  provider: ScrapedResult["source"];
  fetcher: (id: ScrapeIdentifier) => Promise<ScrapedResult | null>;
}

function parseTimeBR(s: string): number | null {
  const m = s.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1] ?? "0", 10);
  const mn = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  return h * 3600 + mn * 60 + sec;
}

/**
 * Latemp: tenta GET no endpoint de classificação geral (HTML server-rendered).
 * Retorna null se não encontrar (caller deve cair em outro provider/mock).
 */
async function latempFetcher(
  raceUrl: string,
  meta: { raceCatalogId: string; raceName: string; raceDate: string; raceCity: string; raceUf: string; distanceMeters: number },
  id: ScrapeIdentifier
): Promise<ScrapedResult | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(raceUrl, { signal: ctrl.signal, headers: { "User-Agent": "corridasderua-bot/1.0 (contato@corridasderua.com)" } });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const html = await resp.text();

    // Heurística genérica: procura linha contendo o CPF ou bib, e extrai
    // colunas adjacentes (posição, tempo). Layouts variam — ajustar por evento.
    const needle = id.bib ?? id.cpf?.replace(/\D/g, "");
    if (!needle) return null;
    const idx = html.indexOf(needle);
    if (idx < 0) return null;

    // Pega até 500 chars ao redor e tenta achar tempo HH:MM:SS
    const slice = html.slice(Math.max(0, idx - 200), idx + 500);
    const tempo = slice.match(/\b(\d{1,2}:\d{2}:\d{2})\b/);
    if (!tempo) return null;
    const netTimeSeconds = parseTimeBR(tempo[1]);
    if (!netTimeSeconds) return null;

    const posMatch = slice.match(/\b(\d{1,5})\s*º?\s*geral/i) ?? slice.match(/\b(\d{1,5})\s*º/);

    return {
      ...meta,
      netTimeSeconds,
      generalRank: posMatch ? parseInt(posMatch[1], 10) : undefined,
      source: "latemp",
    };
  } catch {
    return null; // timeout, DNS, etc — sempre falha silenciosa
  }
}

// Catálogo de provas com scraping habilitado.
// Em produção, isso viria de um BD/painel admin.
const PROVIDERS: ProviderConfig[] = [
  // Exemplo: a Maratona do Rio publicou resultados em latemp.com.br
  // {
  //   raceCatalogId: "maratona-rio-2026",
  //   provider: "latemp",
  //   fetcher: (id) => latempFetcher(
  //     "https://www.latemp.com.br/eventos/maratona-do-rio-2026/resultados",
  //     {
  //       raceCatalogId: "maratona-rio-2026",
  //       raceName: "Maratona do Rio",
  //       raceDate: "2026-06-14",
  //       raceCity: "Rio de Janeiro",
  //       raceUf: "RJ",
  //       distanceMeters: 42195,
  //     },
  //     id
  //   ),
  // },
];

/** Suprime o aviso de import não usado quando os providers estão comentados. */
void latempFetcher;

export async function scrapeResult(raceCatalogId: string, id: ScrapeIdentifier): Promise<ScrapedResult | null> {
  const provider = PROVIDERS.find((p) => p.raceCatalogId === raceCatalogId);
  if (!provider) return null;
  return provider.fetcher(id);
}

export function scraperAvailableFor(raceCatalogId: string): string | null {
  const provider = PROVIDERS.find((p) => p.raceCatalogId === raceCatalogId);
  return provider ? provider.provider : null;
}
