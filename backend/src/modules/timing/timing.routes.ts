// @ts-nocheck
import { Router } from "express";
import { CheckpointType, ResultStatus } from "../../types/enums";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { calculateSplitMetrics, SplitPayload } from "../../utils/time";
import { recalculateEventRanks } from "../../services/ranking-update";

const timingSchema = z.object({
  chip_id: z.string().optional(),
  bib_number: z.number().int().positive(),
  timestamp: z.string(),
  checkpoint_id: z.string().min(1),
});

export const timingRouter = Router();

timingRouter.post("/webhook", async (req, res) => {
  const payload = timingSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Payload inválido." });
  }

  const checkpoint = await prisma.checkpoint.findUnique({ where: { id: payload.data.checkpoint_id } });
  if (!checkpoint) {
    return res.status(404).json({ message: "Checkpoint não encontrado." });
  }

  const registration = await prisma.registration.findFirst({
    where: {
      eventId: checkpoint.eventId,
      bibNumber: payload.data.bib_number,
    },
    include: { category: true, event: true },
  });

  if (!registration) {
    return res.status(404).json({ message: "Inscrição não encontrada para este bib." });
  }

  const result = await prisma.timingResult.upsert({
    where: { registrationId: registration.id },
    create: {
      registrationId: registration.id,
      bibNumber: payload.data.bib_number,
      chipId: payload.data.chip_id,
      splits: [],
      status: ResultStatus.DNS,
    },
    update: {
      chipId: payload.data.chip_id,
    },
  });

  const existingSplits = ((result.splits as SplitPayload[] | null) ?? []).filter(
    (item) => item.checkpointId !== checkpoint.id,
  );

  const splitTime = new Date(payload.data.timestamp);

  const previousSplit = [...existingSplits]
    .sort((a, b) => a.kmMark - b.kmMark)
    .filter((item) => item.kmMark < checkpoint.kmMark)
    .at(-1);

  const metrics = calculateSplitMetrics(
    previousSplit
      ? {
          kmMark: previousSplit.kmMark,
          timestamp: new Date(previousSplit.timestamp),
        }
      : null,
    {
      kmMark: checkpoint.kmMark,
      timestamp: splitTime,
    },
  );

  const nextSplit: SplitPayload = {
    checkpointId: checkpoint.id,
    kmMark: checkpoint.kmMark,
    timestamp: splitTime.toISOString(),
    splitDuration: metrics.splitDuration,
    paceSecondsPerKm: metrics.paceSecondsPerKm,
  };

  const mergedSplits = [...existingSplits, nextSplit].sort((a, b) => a.kmMark - b.kmMark);

  const startSplit = mergedSplits.find((split) => split.kmMark === 0) ?? mergedSplits[0] ?? null;
  const finishSplit = mergedSplits.find((split) => split.checkpointId === checkpoint.id && checkpoint.type === CheckpointType.FINISH)
    ? nextSplit
    : mergedSplits.find((split) => split.kmMark >= registration.event.distanceMeters / 1000);

  const eventStartCheckpoint = await prisma.checkpoint.findFirst({
    where: { eventId: checkpoint.eventId, type: CheckpointType.START },
    orderBy: { order: "asc" },
  });

  const allStarts = eventStartCheckpoint
    ? await prisma.timingResult.findMany({
        where: {
          registration: { eventId: checkpoint.eventId },
          splits: { not: undefined },
        },
        select: { splits: true },
      })
    : [];

  const eventGunStartMs = allStarts
    .flatMap((row) => ((row.splits as SplitPayload[] | null) ?? []).filter((s) => s.kmMark === 0).map((s) => new Date(s.timestamp).getTime()))
    .reduce((acc, value) => (value < acc ? value : acc), Number.POSITIVE_INFINITY);

  const eventGunStart = Number.isFinite(eventGunStartMs)
    ? new Date(eventGunStartMs)
    : startSplit
      ? new Date(startSplit.timestamp)
      : null;

  const status = checkpoint.type === CheckpointType.FINISH ? ResultStatus.FINISHED : ResultStatus.DNF;

  const updated = await prisma.timingResult.update({
    where: { registrationId: registration.id },
    data: {
      splits: mergedSplits,
      status,
      gunTime: eventGunStart,
      netTime: finishSplit ? new Date(finishSplit.timestamp) : null,
    },
  });

  await recalculateEventRanks(checkpoint.eventId);

  const io = req.app.get("io");
  if (io) {
    io.to(`event_${checkpoint.eventId}`).emit("timing:update", {
      registrationId: registration.id,
      bibNumber: registration.bibNumber,
      status: updated.status,
    });
  }

  return res.json(updated);
});
