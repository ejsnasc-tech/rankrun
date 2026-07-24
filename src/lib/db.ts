import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB(): Promise<D1Database> {
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as { DB: D1Database }).DB;
}

export function formatTempo(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function distanciaLabel(metros: number): string {
  if (metros === 5000) return "5K";
  if (metros === 10000) return "10K";
  if (metros === 21097) return "Meia Maratona";
  if (metros === 42195) return "Maratona";
  return `${(metros / 1000).toFixed(1)}K`;
}
