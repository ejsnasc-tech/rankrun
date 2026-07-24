import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

function parseTempo(s: string): number | null {
  if (!s?.trim()) return null;
  const m = s.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { prova_id: string; csv: string };
    const db = await getDB();

    const prova = await db.prepare("SELECT id FROM provas WHERE id = ?").bind(body.prova_id).first();
    if (!prova) return NextResponse.json({ erro: "Prova não encontrada" }, { status: 404 });

    const linhas = body.csv.trim().split("\n").filter(l => l.trim());
    let importados = 0;

    for (const linha of linhas) {
      const [nome, cidade, uf, categoria, tempo_liq, tempo_bruto, col_geral] = linha.split(",").map(s => s?.trim());
      const tempoLiq = parseTempo(tempo_liq);
      if (!nome || !tempoLiq) continue;

      await db.prepare(
        `INSERT INTO resultados (prova_id, atleta_nome, atleta_cidade, atleta_uf, categoria, tempo_liquido_seg, tempo_bruto_seg, colocacao_geral)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        body.prova_id, nome,
        cidade || null, uf?.toUpperCase() || null,
        categoria || null, tempoLiq,
        parseTempo(tempo_bruto),
        col_geral ? Number(col_geral) : null
      ).run();
      importados++;
    }

    await db.prepare("UPDATE provas SET status = 'encerradas' WHERE id = ?").bind(body.prova_id).run();
    return NextResponse.json({ importados });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
