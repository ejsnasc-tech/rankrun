import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

function checkAuth(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const b64 = auth.replace(/^Basic\s+/, "");
  const decoded = atob(b64);
  return decoded.endsWith(":rankrun2026");
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDB();

  // Count before
  const before = await db.prepare("SELECT COUNT(*) AS n FROM resultados").first<{ n: number }>();

  // Delete all rows that are NOT the max-id (= last inserted = finish checkpoint)
  // per (prova_id, atleta_nome, categoria). Previous cleanup was wrong — it grouped
  // by tempo_liquido_seg too, so different split times all survived.
  await db.prepare(`
    DELETE FROM resultados
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM resultados
      GROUP BY prova_id, atleta_nome, COALESCE(categoria, '')
    )
  `).run();

  const after = await db.prepare("SELECT COUNT(*) AS n FROM resultados").first<{ n: number }>();

  const removed = (before?.n ?? 0) - (after?.n ?? 0);
  return NextResponse.json({ ok: true, before: before?.n, after: after?.n, removed });
}
