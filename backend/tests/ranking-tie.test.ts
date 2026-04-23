import { rankEntries } from "../src/utils/ranking";

describe("ranking tie-break", () => {
  it("should break tie by last split timestamp", () => {
    const ranking = rankEntries([
      {
        registrationId: "a",
        categoryId: "cat",
        status: "FINISHED",
        netSeconds: 1200,
        lastSplitAt: "2026-01-01T07:20:10Z",
      },
      {
        registrationId: "b",
        categoryId: "cat",
        status: "FINISHED",
        netSeconds: 1200,
        lastSplitAt: "2026-01-01T07:20:00Z",
      },
    ]);

    expect(ranking.get("b")?.generalRank).toBe(1);
    expect(ranking.get("a")?.generalRank).toBe(2);
  });
});
