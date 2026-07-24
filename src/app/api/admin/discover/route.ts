import { NextResponse } from "next/server";

interface SpchronoResult {
  nome: string;
  cidade: string;
  data: string;
  link: Record<string, { label: string; url: string }>;
}

export async function GET() {
  try {
    const pageRes = await fetch("https://www.sportschrono.com.br/resultados-eventos", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await pageRes.text();

    const jsonUrlMatch = html.match(/url_arquivo_events\s*=\s*'([^']+)'/);
    if (!jsonUrlMatch) throw new Error("URL do JSON não encontrada na página do Sportschrono");

    const jsonRes = await fetch(jsonUrlMatch[1]);
    const data: { listResults: SpchronoResult[] } = await jsonRes.json();

    const events = (data.listResults ?? [])
      .map(ev => {
        const linkEntry = Object.values(ev.link ?? {})[0];
        const url = linkEntry?.url ?? null;
        return { nome: ev.nome, cidade: ev.cidade, data: ev.data, url };
      })
      .filter(e => e.url?.includes("racezone.com.br"));

    return NextResponse.json({ events, total: events.length });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
