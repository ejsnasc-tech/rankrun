import { NextResponse } from "next/server";

interface CdxRow { original: string }

function claxUrlToEvent(claxUrl: string): { nome: string; url: string } | null {
  // e.g. https://brlive.info/brlive/resultados/bsb/bsb.corridasicoob.24112024.clax
  const m = claxUrl.match(/\/resultados\/[^/]+\/([^/]+)\.clax$/i);
  if (!m) return null;
  const slug = m[1]; // bsb.corridasicoob.24112024
  // Extract date part (ddmmyyyy at end) and event name
  const parts = slug.split(".");
  // Last part may be date: ddmmyyyy
  const maybeDate = parts[parts.length - 1];
  const isDate = /^\d{8}$/.test(maybeDate);
  const nameParts = isDate ? parts.slice(0, -1) : parts;
  // First part is city prefix (bsb, gyn, aju, mcp, bel, ...) — skip it
  const eventName = nameParts.slice(1).join(" ").replace(/-/g, " ");
  const nome = eventName.replace(/\b\w/g, c => c.toUpperCase()).trim() || slug;
  // Date: ddmmyyyy → "dd/mm/yyyy"
  let data = "";
  if (isDate) {
    data = `${maybeDate.slice(0, 2)}/${maybeDate.slice(2, 4)}/${maybeDate.slice(4)}`;
  }
  // Relative path inside brlive: resultados/bsb/...
  const fPath = claxUrl.replace(/^https?:\/\/brlive\.info\/brlive\//, "");
  const viewerUrl = `https://brlive.info/brlive/g-live.html?f=${fPath}`;
  return { nome: data ? `${nome} (${data})` : nome, url: viewerUrl };
}

export async function GET() {
  try {
    const events: { nome: string; url: string }[] = [];
    const seen = new Set<string>();

    // ── Wayback Machine CDX API ──────────────────────────────────────────────
    // Busca todos os clax do BrLive já arquivados pelo Wayback Machine
    const cdxEndpoints = [
      "https://web.archive.org/cdx/search/cdx?url=brlive.info/brlive/resultados/bsb/*.clax&output=json&fl=original&collapse=urlkey&limit=2000",
      "https://web.archive.org/cdx/search/cdx?url=brlive.info/brlive/resultados/aju/*.clax&output=json&fl=original&collapse=urlkey&limit=500",
      "https://web.archive.org/cdx/search/cdx?url=brlive.info/brlive/resultados/*.clax&output=json&fl=original&collapse=urlkey&limit=500",
    ];

    for (const cdxUrl of cdxEndpoints) {
      try {
        const res = await fetch(cdxUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) continue;
        const rows: string[][] = await res.json();
        // First row is header ["original"], skip it
        for (const row of rows.slice(1)) {
          const original = row[0];
          if (!original || !original.endsWith(".clax")) continue;
          if (seen.has(original)) continue;
          seen.add(original);
          const ev = claxUrlToEvent(original);
          if (ev) events.push(ev);
        }
      } catch { /* timeout or network error — continue */ }
    }

    // ── Fallback: known events (discovered via search engines) ───────────────
    const knownClax = [
      "https://brlive.info/brlive/resultados/bsb/bsb.corridasicoobengecred.24112024.clax",
      "https://brlive.info/brlive/resultados/bsb/bsb.corridadaaudicao.12112023.clax",
      "https://brlive.info/brlive/resultados/bsb/bsb.emiratesrun.20102024.clax",
      "https://brlive.info/brlive/resultados/bsb/bsb.jinglebells.14122024.clax",
      "https://brlive.info/brlive/resultados/bsb/bsb.corridasenargoias.28012024.clax",
      "https://brlive.info/brlive/resultados/bsb/bsb.corridacemporcentovc.01052025.clax",
      "https://brlive.info/brlive/resultados/bsb/bel.corridadebelém2025.12012025.clax",
      "https://brlive.info/brlive/resultados/bsb/mcp.xcorridaoab.24082025.clax",
      "https://brlive.info/brlive/resultados/bsb/gyn.corridadodragao.30032025.clax",
      "https://brlive.info/brlive/resultados/bsb/mcp.3corridabancarios.14092025.clax",
      "https://brlive.info/brlive/resultados/bsb/bsb.unimedmeiamaratonadegoiania.20102024.clax",
      "https://brlive.info/brlive/resultados/aju/aju.tiradentes.26042025.clax",
      "https://brlive.info/brlive/resultados/bsb/gyn.nisseirun.19072026.clax",
    ];

    for (const claxUrl of knownClax) {
      if (seen.has(claxUrl)) continue;
      seen.add(claxUrl);
      const ev = claxUrlToEvent(claxUrl);
      if (ev) events.push(ev);
    }

    // Sort by date descending (extract date from nome)
    events.sort((a, b) => {
      const da = a.nome.match(/\((\d{2})\/(\d{2})\/(\d{4})\)/);
      const db = b.nome.match(/\((\d{2})\/(\d{2})\/(\d{4})\)/);
      if (!da || !db) return 0;
      const ta = Number(`${da[3]}${da[2]}${da[1]}`);
      const tb = Number(`${db[3]}${db[2]}${db[1]}`);
      return tb - ta;
    });

    return NextResponse.json({ events, total: events.length });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
