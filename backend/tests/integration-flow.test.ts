import { calculateSplitMetrics } from "../src/utils/time";
import { rankEntries } from "../src/utils/ranking";

describe("integration-like flow (register -> payment -> timing -> results)", () => {
  it("should calculate finish and rank after sequence of splits", () => {
    const splits = [
      { kmMark: 0, timestamp: new Date("2026-01-01T07:00:00Z") },
      { kmMark: 1, timestamp: new Date("2026-01-01T07:04:20Z") },
      { kmMark: 2, timestamp: new Date("2026-01-01T07:08:40Z") },
      { kmMark: 5, timestamp: new Date("2026-01-01T07:22:00Z") },
    ];

    const split2 = calculateSplitMetrics(splits[1], splits[2]);
    const finish = calculateSplitMetrics(splits[2], splits[3]);

    expect(split2.splitDuration).toBe(260);
    expect(finish.paceSecondsPerKm).toBe(267);

    const ranking = rankEntries([
      {
        registrationId: "reg-1",
        categoryId: "cat-1",
        status: "FINISHED",
        netSeconds: 1320,
        lastSplitAt: splits[3].timestamp.toISOString(),
      },
      {
        registrationId: "reg-2",
        categoryId: "cat-1",
        status: "DNF",
        netSeconds: null,
        lastSplitAt: null,
      },
    ]);

    expect(ranking.get("reg-1")?.generalRank).toBe(1);
    expect(ranking.get("reg-2")?.generalRank).toBeNull();
  });
});
