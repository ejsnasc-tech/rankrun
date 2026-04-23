export type RankingEntry = {
  registrationId: string;
  categoryId: string;
  status: "FINISHED" | "DNF" | "DNS" | "DSQ";
  netSeconds: number | null;
  lastSplitAt: string | null;
};

export function rankEntries(entries: RankingEntry[]) {
  const finished = entries
    .filter((entry) => entry.status === "FINISHED" && entry.netSeconds != null)
    .sort((a, b) => {
      if ((a.netSeconds ?? 0) !== (b.netSeconds ?? 0)) {
        return (a.netSeconds ?? 0) - (b.netSeconds ?? 0);
      }
      return new Date(a.lastSplitAt ?? 0).getTime() - new Date(b.lastSplitAt ?? 0).getTime();
    });

  const rankingMap = new Map<string, { generalRank: number | null; categoryRank: number | null }>();
  const categoryCounter = new Map<string, number>();

  finished.forEach((entry, index) => {
    const nextCategoryRank = (categoryCounter.get(entry.categoryId) ?? 0) + 1;
    categoryCounter.set(entry.categoryId, nextCategoryRank);

    rankingMap.set(entry.registrationId, {
      generalRank: index + 1,
      categoryRank: nextCategoryRank,
    });
  });

  entries.forEach((entry) => {
    if (!rankingMap.has(entry.registrationId)) {
      rankingMap.set(entry.registrationId, { generalRank: null, categoryRank: null });
    }
  });

  return rankingMap;
}
