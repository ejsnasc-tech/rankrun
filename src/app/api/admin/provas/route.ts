import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>;
    const db = await getDB();
    await db.prepare(
      `INSERT INTO provas (id, titulo, cidade, uf, data, distancia_metros, link_oficial, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'em-breve')`
    ).bind(body.id, body.titulo, body.cidade, body.uf.toUpperCase(), body.data, Number(body.distancia_metros), body.link_oficial || null).run();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
