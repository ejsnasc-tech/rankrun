/** Converte segundos em "HH:MM:SS" ou "MM:SS" se < 1h */
export function formatarTempo(segundos: number | null | undefined): string {
  if (segundos == null) return "—";
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

/** Converte string "HH:MM:SS" ou "MM:SS" para segundos. Retorna null se inválido. */
export function parseTempo(texto: string): number | null {
  const partes = texto.trim().split(":").map((p) => parseInt(p, 10));
  if (partes.some(Number.isNaN)) return null;
  if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  if (partes.length === 2) return partes[0] * 60 + partes[1];
  return null;
}

/** Pace por km a partir de tempo total e distância em metros. */
export function calcularPace(segundos: number, distanciaMetros: number): string {
  if (!segundos || !distanciaMetros) return "—";
  const paceSegPorKm = (segundos / distanciaMetros) * 1000;
  const m = Math.floor(paceSegPorKm / 60);
  const s = Math.round(paceSegPorKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

export function formatarDistancia(metros: number): string {
  if (metros >= 1000) return `${(metros / 1000).toFixed(metros % 1000 === 0 ? 0 : 2)} km`;
  return `${metros} m`;
}
