// @ts-nocheck
import { Router } from "express";
import { ResultSource, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { allowRoles, AuthenticatedRequest, requireAuth } from "../../middlewares/auth";

const resultSchema = z.object({
  raceCatalogId: z.string().optional(),
  raceName: z.string().min(2),
  raceDate: z.string(),
  raceCity: z.string().optional(),
  raceUf: z.string().optional(),
  distanceMeters: z.number().int().positive(),
  netTimeSeconds: z.number().int().positive(),
  grossTimeSeconds: z.number().int().positive().optional(),
  generalRank: z.number().int().positive().optional(),
  categoryName: z.string().optional(),
  categoryRank: z.number().int().positive().optional(),
  certificateUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

export const myResultsRouter = Router();

// Lista todos os resultados do usuário autenticado
myResultsRouter.get("/", requireAuth, allowRoles(Role.corredor), async (req: AuthenticatedRequest, res) => {
  const results = await prisma.result.findMany({
    where: { userId: req.user!.id },
    orderBy: { raceDate: "desc" },
  });
  return res.json(results);
});

// Estatísticas agregadas do corredor (total de provas, km, PRs por distância)
myResultsRouter.get("/stats", requireAuth, allowRoles(Role.corredor), async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const all = await prisma.result.findMany({ where: { userId } });

  const totalRaces = all.length;
  const totalKm = all.reduce((sum, r) => sum + r.distanceMeters / 1000, 0);

  // PR por faixa de distância (5k, 10k, 21k, 42k — tolerância 200m)
  const buckets = [5000, 10000, 21097, 42195];
  const prs = buckets.map((target) => {
    const matches = all.filter((r) => Math.abs(r.distanceMeters - target) <= 200);
    if (matches.length === 0) return { distance: target, prSeconds: null, raceName: null };
    const best = matches.reduce((a, b) => (a.netTimeSeconds < b.netTimeSeconds ? a : b));
    return { distance: target, prSeconds: best.netTimeSeconds, raceName: best.raceName, raceDate: best.raceDate };
  });

  return res.json({ totalRaces, totalKm: Math.round(totalKm), prs });
});

myResultsRouter.post("/", requireAuth, allowRoles(Role.corredor), async (req: AuthenticatedRequest, res) => {
  const payload = resultSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Dados inválidos.", errors: payload.error.format() });
  }
  const result = await prisma.result.create({
    data: {
      ...payload.data,
      userId: req.user!.id,
      raceDate: new Date(payload.data.raceDate),
      source: ResultSource.MANUAL,
    },
  });
  return res.status(201).json(result);
});

myResultsRouter.delete("/:id", requireAuth, allowRoles(Role.corredor), async (req: AuthenticatedRequest, res) => {
  const result = await prisma.result.findUnique({ where: { id: req.params.id } });
  if (!result || result.userId !== req.user!.id) {
    return res.status(404).json({ message: "Resultado não encontrado." });
  }
  await prisma.result.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});
