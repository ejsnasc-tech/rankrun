import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { requireAuth, AuthenticatedRequest } from "../../middlewares/auth";

export const workoutsRouter = Router();

const createSchema = z.object({
  type: z.enum(["RUN", "RIDE", "SWIM", "WALK", "OTHER"]).default("RUN"),
  name: z.string().max(120).optional(),
  startedAt: z.string().min(1),
  distanceMeters: z.number().int().nonnegative(),
  movingSeconds: z.number().int().nonnegative(),
  elevationGain: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

workoutsRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const workouts = await prisma.workout.findMany({
    where: { userId: req.user!.id },
    orderBy: { startedAt: "desc" },
    take: 200,
  });
  res.json(workouts);
});

workoutsRouter.get("/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const last30 = await prisma.workout.findMany({
    where: { userId: req.user!.id, startedAt: { gte: since } },
    select: { distanceMeters: true, movingSeconds: true, type: true },
  });
  const totalKm = last30.reduce((acc, w) => acc + w.distanceMeters / 1000, 0);
  const totalSeconds = last30.reduce((acc, w) => acc + w.movingSeconds, 0);
  res.json({
    last30Days: {
      workouts: last30.length,
      km: Math.round(totalKm * 10) / 10,
      hours: Math.round((totalSeconds / 3600) * 10) / 10,
    },
  });
});

workoutsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  const data = parsed.data;
  const workout = await prisma.workout.create({
    data: {
      userId: req.user!.id,
      source: "MANUAL",
      type: data.type,
      name: data.name ?? null,
      startedAt: new Date(data.startedAt),
      distanceMeters: data.distanceMeters,
      movingSeconds: data.movingSeconds,
      elevationGain: data.elevationGain ?? null,
      notes: data.notes ?? null,
    },
  });
  res.status(201).json(workout);
});

workoutsRouter.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const w = await prisma.workout.findUnique({ where: { id: req.params.id } });
  if (!w || w.userId !== req.user!.id) return res.status(404).json({ message: "Treino não encontrado." });
  await prisma.workout.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
