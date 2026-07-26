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
  if (/^5\s*KM/.test(m) || m.includes("5K") || m === "5") return 5000;
  if (/^10\s*KM/.test(m) || m.includes("10K") || m === "10") return 10000;
  if (/^21\s*KM/.test(m) || m.includes("MEIA") || m.includes("HALF") || m === "21") return 21097;
  if (/^42\s*KM/.test(m) || m.includes("MARATONA") || m.includes("MARATHON") || m === "42") return 42195;
  return 0;
}

function parseAttrsXml(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

function parseClaxTempo(t: string): number | null {
  if (!t) return null;
  const m = t.match(/^(\d+)h(\d+)[''`](\d+)/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
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

// ─── Sportschrono Clax (XML) ──────────────────────────────────────────────────

async function fetchClaxXml(dataUrl: string, referer: string): Promise<string> {
  // sportschrono.com.br (non-www) redirects and strips /resultados/ from path → use www. directly
  const fetchUrl = dataUrl.replace(/^(https?:\/\/)sportschrono\.com\.br\//, "$1www.sportschrono.com.br/")
                          .replace(/^http:\/\//, "https://");
  const xmlRes = await fetch(fetchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "*/*",
      "Referer": referer,
    },
  });
  if (xmlRes.ok) return xmlRes.text();

  // BrLive blocks Worker IPs (406), Sportschrono may remove old files (404) → Wayback Machine fallback
  if (xmlRes.status === 404 || xmlRes.status === 403 || xmlRes.status === 406 || xmlRes.status === 451) {
    const availRes = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(dataUrl)}`);
    if (availRes.ok) {
      const avail = await availRes.json() as { archived_snapshots?: { closest?: { available?: boolean; url?: string } } };
      const closestUrl = avail.archived_snapshots?.closest?.url;
      if (closestUrl) {
        const rawUrl = closestUrl.replace(/\/web\/(\d+)\//, "/web/$1if_/");
        const wbRes = await fetch(rawUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (wbRes.ok) return wbRes.text();
      }
    }
  }

  throw new Error(`Falha ao buscar clax: ${xmlRes.status}`);
}

async function scrapeClax(gliveUrl: string, tituloHint?: string) {
  // "https://www.sportschrono.com.br/resultados/g-live.html?f=evento/2025/SLUG/SLUG.clax"
  const fMatch = gliveUrl.match(/[?&]f=(.+\.clax)/i);
  if (!fMatch) throw new Error("URL do clax inválida — esperado ?f=...clax");
  const fPath = decodeURIComponent(fMatch[1]); // evento/2025/SLUG/SLUG.clax

  // Extract base dir from any *.html?f= viewer URL
  // e.g. https://brlive.info/brlive/g-live.html → https://brlive.info/brlive/
  //      https://brlive.info/brlive/brlive-bsb.html → https://brlive.info/brlive/
  const baseUrl = gliveUrl.match(/^(https?:\/\/.+\/)[^/]+\.html/i)?.[1]
    ?? "https://www.sportschrono.com.br/resultados/";
  const dataUrl = baseUrl + fPath;

  const xml = await fetchClaxXml(dataUrl, gliveUrl.split("?")[0]);

  if (!xml.includes("<Epreuve")) throw new Error("Arquivo clax não encontrado ou formato inválido");

  // Parse Epreuve header
  const eprMatch = xml.match(/<Epreuve ([^>]+)>/);
  const epr = eprMatch ? parseAttrsXml(eprMatch[1]) : {};

  // Parse date from "domingo, 21 de dezembro de 2025"
  const MONTHS: Record<string, number> = { janeiro:1,fevereiro:2,março:3,marco:3,abril:4,maio:5,junho:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12 };
  const dateStr = epr.dates ?? "";
  const dm = dateStr.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  const mes = dm ? (MONTHS[dm[2].toLowerCase()] ?? 1) : 1;
  const data = dm ? `${dm[3]}-${String(mes).padStart(2,"0")}-${String(Number(dm[1])).padStart(2,"0")}`
    : new Date().toISOString().slice(0, 10);

  // Build athlete map keyed by dossard
  const engMap: Record<string, { nome: string; categoria: string; parcours: string; cidade: string }> = {};
  for (const m of xml.matchAll(/<E ([^/]+)\/>/g)) {
    const a = parseAttrsXml(m[1]);
    if (!a.d) continue;
    engMap[a.d] = {
      nome: a.n ?? "",
      categoria: [a.ca, a.x].filter(Boolean).join(" ").trim(),
      parcours: a.p ?? "",
      cidade: a.rg ?? "",
    };
  }

  // A clax file records multiple <R> tags per athlete (1km split, 2km split, finish, etc.)
  // Deduplicate by dossard, keeping only the result with the maximum tempo (= finish line).
  const resultMap: Record<string, Record<string, string>> = {};
  for (const m of xml.matchAll(/<R ([^/]+)\/>/g)) {
    const a = parseAttrsXml(m[1]);
    if (!a.d) continue;
    const tempo = parseClaxTempo(a.re ?? a.t ?? "") ?? 0;
    const prev = resultMap[a.d];
    const prevTempo = prev ? (parseClaxTempo(prev.re ?? prev.t ?? "") ?? 0) : 0;
    if (tempo > prevTempo) resultMap[a.d] = a;
  }

  // Build athlete list sorted by finish time (ascending)
  const atletas = [];
  for (const [d, a] of Object.entries(resultMap)) {
    const eng = engMap[d];
    if (!eng) continue;
    const tempoLiq = parseClaxTempo(a.re ?? a.t ?? "");
    if (!tempoLiq) continue;
    const distMetros = modalidadeToMetros(eng.parcours) || 5000;
    atletas.push({
      atleta_nome: eng.nome || null,
      atleta_uf: null as string | null,
      categoria: (eng.categoria + (eng.parcours ? " / " + eng.parcours : "")).trim() || null,
      tempo_liquido_seg: tempoLiq,
      tempo_bruto_seg: null as number | null,
      colocacao_geral: null as number | null,
      distancia_metros: distMetros,
    });
  }
  // Sort by finish time and assign rank
  atletas.sort((a, b) => (a.tempo_liquido_seg ?? 0) - (b.tempo_liquido_seg ?? 0));
  atletas.forEach((a, i) => { a.colocacao_geral = i + 1; });

  if (atletas.length === 0) throw new Error("Nenhum resultado encontrado no clax");

  const distCounts: Record<number, number> = {};
  for (const a of atletas) distCounts[a.distancia_metros] = (distCounts[a.distancia_metros] ?? 0) + 1;
  const primaryDistancia = Number(Object.entries(distCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 5000);

  // Title: prefer hint from discover, else clean up slug
  const slugName = fPath.match(/\/([^/]+)\.clax$/i)?.[1]?.replace(/-/g, " ") ?? epr.nom ?? "Corrida";
  const titulo = tituloHint || slugName.replace(/\b\w/g, c => c.toUpperCase());

  const prova = {
    id: slugify(`${titulo}-${data.slice(0, 4)}`),
    titulo,
    cidade: null as string | null,
    uf: null as string | null,
    data,
    distancia_metros: primaryDistancia,
  };

  return { prova, atletas };
}

// ─── ChipBrasil (segue redirect para BrLive) ──────────────────────────────────

async function scrapeChipBrasil(url: string, tituloHint?: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html,*/*" },
  });
  // Se o servidor redirecionou para um g-live.html, usa scrapeClax direto
  if (res.url.includes("g-live.html") || res.url.includes(".clax")) {
    return scrapeClax(res.url, tituloHint);
  }
  // Tenta encontrar um link BrLive na página HTML
  const html = await res.text();
  const m = html.match(/https:\/\/brlive\.info\/brlive\/g-live\.html\?f=[^\s"'<]+/);
  if (m) return scrapeClax(m[0], tituloHint);
  throw new Error("Não foi possível encontrar o resultado no ChipBrasil. Copie e use a URL do BrLive diretamente.");
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
    const { url, titulo } = await req.json() as { url: string; titulo?: string };
    if (!url) return NextResponse.json({ erro: "URL não informada" }, { status: 400 });

    let scraped: { prova: { id: string; titulo: string; cidade: string | null; uf: string | null; data: string; distancia_metros: number }; atletas: { atleta_nome: string | null; atleta_uf: string | null; categoria: string | null; tempo_liquido_seg: number | null; tempo_bruto_seg: number | null; colocacao_geral: number | null; distancia_metros: number }[] };

    if (url.includes("racezone.com.br")) {
      scraped = await scrapeRacezone(url);
    } else if (url.includes("o2corre.com.br") || url.includes("activodeporte")) {
      scraped = await scrapeActivo(url);
    } else if (url.includes("brlive.info") || url.includes("g-live.html") || url.includes("brlive-bsb") || url.includes(".clax")) {
      // Sportschrono, BrLive/ChipBrasil (g-live.html, brlive-bsb.html, brlive-bsb1.html), etc.
      scraped = await scrapeClax(url, titulo);
    } else if (url.includes("chipbrasil.com.br")) {
      // ChipBrasil: follow the redirect/link to the BrLive viewer
      scraped = await scrapeChipBrasil(url, titulo);
    } else {
      return NextResponse.json({ erro: "Plataforma não suportada. URLs aceitas: racezone.com.br, o2corre.com.br, chipbrasil.com.br, brlive.info, sportschrono.com.br" }, { status: 400 });
    }

    const { prova, atletas } = scraped;
    const db = await getDB();

    // Create prova if not exists, skip entirely if already imported
    let provaId = prova.id;
    const existing = await db.prepare("SELECT id FROM provas WHERE id = ?").bind(provaId).first<{id: string}>();
    if (existing) {
      return NextResponse.json({ ok: true, importados: 0, prova_id: provaId, titulo: prova.titulo, skipped: true });
    }

    // Resolve slug collision
    let suffix = 0;
    while (await db.prepare("SELECT id FROM provas WHERE id = ?").bind(provaId).first()) {
      provaId = `${prova.id}-${++suffix}`;
    }

    await db.prepare(
      `INSERT INTO provas (id, titulo, cidade, uf, data, distancia_metros, status, link_oficial)
       VALUES (?, ?, ?, ?, ?, ?, 'encerradas', ?)`
    ).bind(
      provaId,
      prova.titulo || "Sem título",
      prova.cidade || "",        // NOT NULL — empty string when unknown
      prova.uf || "",            // NOT NULL — empty string when unknown
      prova.data || new Date().toISOString().slice(0, 10),
      prova.distancia_metros || 5000,
      url,
    ).run();

    // Batch insert all results (single D1 roundtrip — fast)
    const toInsert = atletas.filter(a => a.tempo_liquido_seg != null);
    const SQL = `INSERT INTO resultados (prova_id, atleta_nome, atleta_uf, categoria, tempo_liquido_seg, tempo_bruto_seg, colocacao_geral) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const CHUNK = 100;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      await db.batch(chunk.map(a =>
        db.prepare(SQL).bind(provaId, a.atleta_nome ?? null, a.atleta_uf ?? null, a.categoria ?? null, a.tempo_liquido_seg ?? null, a.tempo_bruto_seg ?? null, a.colocacao_geral ?? null)
      ));
    }

    return NextResponse.json({ ok: true, importados: toInsert.length, prova_id: provaId, titulo: prova.titulo });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
