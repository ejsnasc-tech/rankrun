export type SplitPayload = {
  checkpointId: string;
  kmMark: number;
  timestamp: string;
  splitDuration: number;
  paceSecondsPerKm: number;
};

const yearMs = 365.25 * 24 * 60 * 60 * 1000;

export function calculateAgeForEvent(eventDate: Date, birthDate: Date): number {
  return Math.floor((eventDate.getTime() - birthDate.getTime()) / yearMs);
}

export function calculateSplitMetrics(
  previous: { kmMark: number; timestamp: Date } | null,
  current: { kmMark: number; timestamp: Date },
) {
  if (!previous) {
    return { splitDuration: 0, paceSecondsPerKm: 0 };
  }

  const distanceDelta = current.kmMark - previous.kmMark;
  const splitDuration = Math.max(0, Math.floor((current.timestamp.getTime() - previous.timestamp.getTime()) / 1000));

  return {
    splitDuration,
    paceSecondsPerKm: distanceDelta > 0 ? Math.round(splitDuration / distanceDelta) : 0,
  };
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) {
    return "--:--:--";
  }
  const s = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(s / 3600)
    .toString()
    .padStart(2, "0");
  const mm = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || secondsPerKm < 0) {
    return "--";
  }
  const mm = Math.floor(secondsPerKm / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(secondsPerKm % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss}/km`;
}
