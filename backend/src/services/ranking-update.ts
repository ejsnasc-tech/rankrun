// @ts-nocheck
import { prisma } from "../prisma/client";
import { rankEntries } from "../utils/ranking";
import { SplitPayload } from "../utils/time";

export async function recalculateEventRanks(eventId: string) {
  const results = await prisma.timingResult.findMany({
    where: { registration: { eventId } },
    include: { registration: true },
  });

  const ranking = rankEntries(
    results.map((result) => {
      const splits = (result.splits as SplitPayload[] | null) ?? [];
      const startSplit = splits.find((split) => split.splitDuration === 0);
      const finishSplit = splits.at(-1);
      const netSeconds = startSplit && finishSplit ? Math.floor((new Date(finishSplit.timestamp).getTime() - new Date(startSplit.timestamp).getTime()) / 1000) : null;

      return {
        registrationId: result.registrationId,
        categoryId: result.registration.categoryId,
        status: result.status,
        netSeconds,
        lastSplitAt: finishSplit?.timestamp ?? null,
      };
    }),
  );

  await Promise.all(
    results.map((result) => {
      const data = ranking.get(result.registrationId);
      return prisma.timingResult.update({
        where: { id: result.id },
        data: {
          generalRank: data?.generalRank ?? null,
          categoryRank: data?.categoryRank ?? null,
        },
      });
    }),
  );
}
