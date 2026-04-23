export function nextBib(existingBibs: number[]): number {
  let next = 1;
  const sorted = [...existingBibs].sort((a, b) => a - b);
  for (const bib of sorted) {
    if (bib === next) {
      next += 1;
    }
  }
  return next;
}
