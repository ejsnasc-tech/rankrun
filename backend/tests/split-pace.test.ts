import { calculateSplitMetrics } from "../src/utils/time";

describe("split and pace", () => {
  it("should compute split duration and pace per km", () => {
    const metrics = calculateSplitMetrics(
      { kmMark: 1, timestamp: new Date("2026-01-01T07:04:00Z") },
      { kmMark: 2, timestamp: new Date("2026-01-01T07:08:20Z") },
    );

    expect(metrics.splitDuration).toBe(260);
    expect(metrics.paceSecondsPerKm).toBe(260);
  });
});
