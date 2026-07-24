import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

// ─── helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseTempo(s: string): number | null {
  if (!s) return null;
  const m = s.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\.\d+)?$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function kmToMetros(km: number): number {
  if (km === 5) return 5000;
  if (km === 10) return 10000;
  if (km >= 20 && km <= 22) return 21097;
  if (km >= 40 && km <= 43) return 42195;
  return Math.round(km * 1000);
}

function modalidadeToMetros(mod: string): number {
  const m = mod.toUpperCase();
  if (m.includes("5K") || m === "5") return 5000;
  if (m.includes("10K") || m === "10") return 10000;
  if (m.includes("MEIA") || m.includes("HALF") || m === "21") return 21097;
  if (m.includes("MARATONA") || m.includes("MARATHON") || m === "42") return 42195;
  return 0;
}

// ─── Racezone ─────────────────────────────────────────────────────────────────

async function scrapeRacezone(url: string) {
  // https://resultados.racezone.com.br/{client}/#/{slug}
  const match = url.match(/racezone\.com\.br\/([^/#?]+)\/?#?\/?([\w\-]+)?/);
  if (!match) throw new Error("URL do Racezone inválida");
  const client = match[1];
  const urlSlug = match[2] || "";
  const base = `https://resultados.racezone.com.br/${client}/data`;

  // Get events list
  const eventsRes = await fetch(`${base}/events.json`);
  if (!eventsRes.ok) throw new Error(`Não foi possível buscar eventos do Racezone (${eventsRes.status})`);
  const events: RazEvent[] = await eventsRes.json();

  // Find event by link slug or ID
  const event = events.find(e => e.link === urlSlug || e.id === urlSlug);
  if (!event) throw new Error(`Evento "${urlSlug}" não encontrado. Slugs disponíveis: ${events.map(e => e.link).slice(0, 5).join(", ")}`);

  // Get event details (routes + categories)
  const eventRes = await fetch(`${base}/${event.id}/event.json`);
  const eventData: RazEventData = await eventRes.json();
  const routeMap = Object.fromEntries(eventData.routes.map(r => [r.i, r]));
  const catMap = Object.fromEntries(eventData.categories.map(c => [c.i, c.n]));

  // Get results
  const resultsRes = await fetch(`${base}/${event.id}/results.json`);
  if (!resultsRes.ok) throw new Error("Resultados ainda não disponíveis");
  const results: RazResult[] = await resultsRes.json();

  // Determine primary distance
  const distanceCounts: Record<number, number> = {};
  for (const r of results) {
    const route = routeMap[r.r];
    const metros = route ? kmToMetros(route.d) : 0;
    if (metros > 0) distanceCounts[metros] = (distanceCounts[metros] ?? 0) + 1;
  }
  const primaryDistancia = Number(Object.entries(distanceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 5000);

  // Parse place → city + uf ("PIRAMBU - SERGIPE" → cidade="PIRAMBU", uf="SE")
  const placeParts = event.place.split(/\s*-\s*/);
  const estadoNome = placeParts.at(-1)?.trim() ?? "";
  const UF_MAP: Record<string, string> = {
    "ACRE":"AC","ALAGOAS":"AL","AMAPÁ":"AP","AMAPA":"AP","AMAZONAS":"AM","BAHIA":"BA",
    "CEARÁ":"CE","CEARA":"CE","DISTRITO FEDERAL":"DF","ESPÍRITO SANTO":"ES","ESPIRITO SANTO":"ES",
    "GOIÁS":"GO","GOIAS":"GO","MARANHÃO":"MA","MARANHAO":"MA","MATO GROSSO DO SUL":"MS",
    "MATO GROSSO":"MT","MINAS GERAIS":"MG","PARÁ":"PA","PARA":"PA","PARAÍBA":"PB","PARAIBA":"PB",
    "PARANÁ":"PR","PARANA":"PR","PERNAMBUCO":"PE","PIAUÍ":"PI","PIAUI":"PI","RIO DE JANEIRO":"RJ",
    "RIO GRANDE DO NORTE":"RN","RIO GRANDE DO SUL":"RS","RONDÔNIA":"RO","RONDONIA":"RO",
    "RORAIMA":"RR","SANTA CATARINA":"SC","SÃO PAULO":"SP","SAO PAULO":"SP","SERGIPE":"SE",
    "TOCANTINS":"TO",
  };
  const uf = UF_MAP[estadoNome.toUpperCase()] ?? (estadoNome.length === 2 ? estadoNome.toUpperCase() : "BR");
  const cidade = placeParts.slice(0, -1).join(" - ").trim() || event.place;

  const prova = {
    id: slugify(`${event.name}-${event.startDate.slice(0, 4)}`),
    titulo: event.name,
    cidade,
    uf,
    data: event.startDate,
    distancia_metros: primaryDistancia,
  };

  const atletas = results.map(r => {
    const route = routeMap[r.r];
    const catNome = catMap[r.c] ?? r.c ?? null;
    const distMetros = route ? kmToMetros(route.d) : primaryDistancia;
    const categoriaFull = [catNome, route?.n].filter(Boolean).join(" / ");
    return {
      atleta_nome: r.nm,
      atleta_uf: r.ct?.uf?.toUpperCase() ?? null,
      categoria: categoriaFull || null,
      tempo_liquido_seg: parseTempo(r.tn) ?? parseTempo(r.tg),
      tempo_bruto_seg: parseTempo(r.tg),
      colocacao_geral: typeof r.rg === "number" ? r.rg : null,
      distancia_metros: distMetros,
    };
  }).filter(a => a.tempo_liquido_seg != null);

  return { prova, atletas };
}

// ─── Activo / o2corre ─────────────────────────────────────────────────────────

async function scrapeActivo(url: string) {
  const match = url.match(/resultado\/(\d+)/);
  if (!match) throw new Error("URL do o2corre inválida — esperado /resultado/{id}");
  const idEvento = match[1];

  // Get event info from NEXT_DATA
  const pageRes = await fetch(`https://www.o2corre.com.br/resultado/${idEvento}/`);
  const pageHtml = await pageRes.text();
  const ndMatch = pageHtml.match(/id="__NEXT_DATA__"[^>]*>(\{.+?\})<\/script>/);
  let eventInfo = { titulo: `Corrida ${idEvento}`, cidade: "", uf: "" };
  if (ndMatch) {
    try {
      const nd = JSON.parse(ndMatch[1]);
      const ev = nd?.props?.pageProps?.events?.[0];
      if (ev) {
        eventInfo = {
          titulo: ev.title_evento ?? eventInfo.titulo,
          cidade: ev.cidade ?? "",
          uf: ev.estado ?? "",
        };
      }
    } catch { /* ignore */ }
  }

  // Paginate through Activo API
  const allResults: ActivoResult[] = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `https://webservices.esferabr.com.br/Ativo/Resultado?id_evento=${idEvento}&offset=${offset}`,
      { headers: { Referer: "https://www.o2corre.com.br/" } }
    );
    if (!res.ok) break;
    const batch: ActivoResult[] = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    allResults.push(...batch);
    if (batch.length < 100) break;
    offset += 100;
  }

  if (allResults.length === 0) throw new Error("Nenhum resultado encontrado para este evento");

  // Determine most common distance
  const distCounts: Record<number, number> = {};
  for (const r of allResults) {
    const metros = modalidadeToMetros(r.modalidade ?? "");
    if (metros > 0) distCounts[metros] = (distCounts[metros] ?? 0) + 1;
  }
  const primaryDistancia = Number(Object.entries(distCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 5000);

  // Get date from first result if available
  const dataEvento = allResults[0] ? (() => {
    const raw = allResults.find(r => r.ft_inicio)?.ft_inicio;
    if (raw) return raw.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  })() : new Date().toISOString().slice(0, 10);

  const prova = {
    id: slugify(`${eventInfo.titulo}-${dataEvento.slice(0, 4)}`),
    titulo: eventInfo.titulo,
    cidade: eventInfo.cidade,
    uf: eventInfo.uf.replace(/^.*-\s*/, "").trim(),
    data: dataEvento,
    distancia_metros: primaryDistancia,
  };

  const atletas = allResults.map(r => ({
    atleta_nome: r.nome,
    atleta_uf: null as string | null,
    categoria: [r.categoria, r.modalidade !== (Object.entries(distCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] ? modalidadeToMetros(r.modalidade ?? "") + "" : "") ? r.modalidade : ""].filter(Boolean).join(" / ") || r.categoria || null,
    tempo_liquido_seg: parseTempo(r.tempo_total ?? ""),
    tempo_bruto_seg: parseTempo(r.tempo_bruto ?? ""),
    colocacao_geral: r.itens?.classificacao_total ? Number(r.itens.classificacao_total) : null,
    distancia_metros: modalidadeToMetros(r.modalidade ?? "") || primaryDistancia,
  })).filter(a => a.tempo_liquido_seg != null);

  return { prova, atletas };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RazEvent { id: string; name: string; place: string; link: string; startDate: string; }
interface RazEventData {
  routes: { i: string; n: string; d: number }[];
  categories: { i: string; n: string }[];
}
interface RazResult {
  nm: string; g: string; r: string; c: string; rg: number;
  tn: string; tg: string; ct?: { uf?: string };
}
interface ActivoResult {
  nome: string; modalidade?: string; categoria?: string;
  tempo_total?: string; tempo_bruto?: string; ft_inicio?: string;
  itens?: { classificacao_total?: string };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url: string };
    if (!url) return NextResponse.json({ erro: "URL não informada" }, { status: 400 });

    let scraped: { prova: { id: string; titulo: string; cidade: string; uf: string; data: string; distancia_metros: number }; atletas: { atleta_nome: string; atleta_uf: string | null; categoria: string | null; tempo_liquido_seg: number | null; tempo_bruto_seg: number | null; colocacao_geral: number | null; distancia_metros: number }[] };

    if (url.includes("racezone.com.br")) {
      scraped = await scrapeRacezone(url);
    } else if (url.includes("o2corre.com.br") || url.includes("activodeporte")) {
      scraped = await scrapeActivo(url);
    } else {
      return NextResponse.json({ erro: "Plataforma não suportada. URLs aceitas: racezone.com.br, o2corre.com.br" }, { status: 400 });
    }

    const { prova, atletas } = scraped;
    const db = await getDB();

    // Create or ignore prova
    let provaId = prova.id;
    const existing = await db.prepare("SELECT id FROM provas WHERE id = ?").bind(provaId).first<{id: string}>();
    if (!existing) {
      // Check for collision
      let suffix = 0;
      while (await db.prepare("SELECT id FROM provas WHERE id = ?").bind(provaId).first()) {
        provaId = `${prova.id}-${++suffix}`;
      }
      await db.prepare(
        `INSERT INTO provas (id, titulo, cidade, uf, data, distancia_metros, status)
         VALUES (?, ?, ?, ?, ?, ?, 'encerradas')`
      ).bind(
        provaId,
        prova.titulo || "Sem título",
        prova.cidade || null,
        prova.uf || null,
        prova.data || null,
        prova.distancia_metros || 5000,
      ).run();
    }

    // Import results in batches
    let importados = 0;
    for (const a of atletas) {
      if (!a.tempo_liquido_seg) continue;
      await db.prepare(
        `INSERT INTO resultados (prova_id, atleta_nome, atleta_uf, categoria, tempo_liquido_seg, tempo_bruto_seg, colocacao_geral)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        provaId,
        a.atleta_nome ?? null,
        a.atleta_uf ?? null,
        a.categoria ?? null,
        a.tempo_liquido_seg ?? null,
        a.tempo_bruto_seg ?? null,
        a.colocacao_geral ?? null,
      ).run();
      importados++;
    }

    return NextResponse.json({ ok: true, importados, prova_id: provaId, titulo: prova.titulo });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
