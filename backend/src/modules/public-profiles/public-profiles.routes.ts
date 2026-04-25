// @ts-nocheck
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { allowRoles, AuthenticatedRequest, requireAuth } from "../../middlewares/auth";
import { Role } from "../../types/enums";

export const publicProfilesRouter = Router();

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function computeBadges(results: any[]): { code: string; title: string; subtitle: string; icon: string }[] {
  const badges: { code: string; title: string; subtitle: string; icon: string }[] = [];

  // Provas finalizadas
  if (results.length >= 1) {
    badges.push({ code: "primeira_prova", title: "Primeira prova", subtitle: "Bem-vindo ao clube", icon: "🎽" });
  }
  if (results.length >= 5) {
    badges.push({ code: "5_provas", title: "5 provas", subtitle: "Já é veterano", icon: "🏅" });
  }
  if (results.length >= 10) {
    badges.push({ code: "10_provas", title: "10 provas", subtitle: "Atleta consistente", icon: "🏆" });
  }

  // Maratona finalizada
  const maratonas = results.filter((r) => Math.abs(r.distanceMeters - 42195) <= 200);
  if (maratonas.length >= 1) {
    badges.push({ code: "maratonista", title: "Maratonista", subtitle: "Cruzou a linha de 42K", icon: "🥇" });
  }

  // Sub-25 nos 5K
  const cincos = results.filter((r) => Math.abs(r.distanceMeters - 5000) <= 200);
  if (cincos.some((r) => r.netTimeSeconds < 25 * 60)) {
    badges.push({ code: "sub25_5k", title: "Sub 25 nos 5K", subtitle: "Velocista", icon: "⚡" });
  }

  // Sub-50 nos 10K
  const dezes = results.filter((r) => Math.abs(r.distanceMeters - 10000) <= 200);
  if (dezes.some((r) => r.netTimeSeconds < 50 * 60)) {
    badges.push({ code: "sub50_10k", title: "Sub 50 nos 10K", subtitle: "Pace forte", icon: "🚀" });
  }

  // Sub-2h na meia
  const meias = results.filter((r) => Math.abs(r.distanceMeters - 21097) <= 200);
  if (meias.some((r) => r.netTimeSeconds < 2 * 60 * 60)) {
    badges.push({ code: "sub2h_21k", title: "Sub 2h na meia", subtitle: "Ritmo de elite amador", icon: "💨" });
  }

  // Sub-4h na maratona
  if (maratonas.some((r) => r.netTimeSeconds < 4 * 60 * 60)) {
    badges.push({ code: "sub4h_42k", title: "Sub 4h na maratona", subtitle: "Pace abaixo de 5:41/km", icon: "🔥" });
  }

  // Provas no ano corrente
  const ano = new Date().getFullYear();
  const noAno = results.filter((r) => new Date(r.raceDate).getFullYear() === ano).length;
  if (noAno >= 5) {
    badges.push({ code: "5_no_ano", title: `5 provas em ${ano}`, subtitle: "Calendário cheio", icon: "📅" });
  }

  return badges;
}

// GET /public/atletas — listagem com busca por nome/cidade/uf
publicProfilesRouter.get("/atletas", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim() ?? "";
  const uf = (req.query.uf as string | undefined)?.trim().toUpperCase() ?? "";

  const where: any = { publicProfile: true, slug: { not: null }, role: "corredor" };
  if (uf) where.uf = uf;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { city: { contains: q } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, slug: true, city: true, uf: true, bio: true, results: { select: { id: true } } },
    take: 100,
  });

  const atletas = users
    .map((u) => ({ name: u.name, slug: u.slug, city: u.city, uf: u.uf, bio: u.bio, totalRaces: u.results.length }))
    .sort((a, b) => b.totalRaces - a.totalRaces);

  return res.json({ atletas });
});

// GET /public/rankings — top atletas por distância
publicProfilesRouter.get("/rankings", async (_req, res) => {
  const buckets = [
    { distance: 5000, label: "5K", tolerance: 200 },
    { distance: 10000, label: "10K", tolerance: 200 },
    { distance: 21097, label: "Meia maratona", tolerance: 200 },
    { distance: 42195, label: "Maratona", tolerance: 200 },
  ];

  const users = await prisma.user.findMany({
    where: { publicProfile: true, slug: { not: null }, role: "corredor" },
    select: {
      name: true,
      slug: true,
      city: true,
      uf: true,
      results: {
        select: { distanceMeters: true, netTimeSeconds: true, raceName: true, raceDate: true },
      },
    },
  });

  const rankings = buckets.map((b) => {
    const candidates = users
      .map((u) => {
        const matches = u.results.filter((r) => Math.abs(r.distanceMeters - b.distance) <= b.tolerance);
        if (matches.length === 0) return null;
        const best = matches.reduce((a, c) => (a.netTimeSeconds < c.netTimeSeconds ? a : c));
        return {
          name: u.name,
          slug: u.slug,
          city: u.city,
          uf: u.uf,
          netTimeSeconds: best.netTimeSeconds,
          raceName: best.raceName,
          raceDate: best.raceDate,
        };
      })
      .filter(Boolean) as any[];
    candidates.sort((a, b2) => a.netTimeSeconds - b2.netTimeSeconds);
    return { distance: b.distance, label: b.label, top: candidates.slice(0, 20) };
  });

  return res.json({ rankings });
});

// GET /public/atletas/:slug — página pública (sem auth)
publicProfilesRouter.get("/atletas/:slug", async (req, res) => {
  const slug = req.params.slug;
  const user = await prisma.user.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      bio: true,
      city: true,
      uf: true,
      slug: true,
      publicProfile: true,
      createdAt: true,
    },
  });
  if (!user || !user.publicProfile) {
    return res.status(404).json({ message: "Perfil não encontrado." });
  }

  const results = await prisma.result.findMany({
    where: { userId: user.id },
    orderBy: { raceDate: "desc" },
    select: {
      id: true,
      raceName: true,
      raceDate: true,
      raceCity: true,
      raceUf: true,
      distanceMeters: true,
      netTimeSeconds: true,
      generalRank: true,
      categoryName: true,
      categoryRank: true,
    },
  });

  const totalRaces = results.length;
  const totalKm = Math.round(results.reduce((s, r) => s + r.distanceMeters / 1000, 0));

  const buckets = [5000, 10000, 21097, 42195];
  const prs = buckets
    .map((target) => {
      const matches = results.filter((r) => Math.abs(r.distanceMeters - target) <= 200);
      if (matches.length === 0) return null;
      const best = matches.reduce((a, b) => (a.netTimeSeconds < b.netTimeSeconds ? a : b));
      return { distance: target, prSeconds: best.netTimeSeconds, raceName: best.raceName, raceDate: best.raceDate };
    })
    .filter(Boolean);

  const badges = computeBadges(results);

  // Evolução por mês — pace médio (s/km) das provas de cada mês (últimos 24 meses)
  const evolucaoMap = new Map<string, { totalSeconds: number; totalKm: number }>();
  for (const r of results) {
    const d = new Date(r.raceDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const prev = evolucaoMap.get(key) ?? { totalSeconds: 0, totalKm: 0 };
    prev.totalSeconds += r.netTimeSeconds;
    prev.totalKm += r.distanceMeters / 1000;
    evolucaoMap.set(key, prev);
  }
  const evolucao = Array.from(evolucaoMap.entries())
    .map(([month, v]) => ({
      month,
      paceSeconds: v.totalKm > 0 ? Math.round(v.totalSeconds / v.totalKm) : 0,
      km: Math.round(v.totalKm * 10) / 10,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-24);

  // Treinos dos últimos 30 dias (privacidade: total agregado, não detalhes)
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const recentWorkouts = await prisma.workout.findMany({
    where: { userId: user.id, startedAt: { gte: since } },
    select: { distanceMeters: true, movingSeconds: true, source: true },
  });
  const trainingLast30 = {
    workouts: recentWorkouts.length,
    km: Math.round(recentWorkouts.reduce((a, w) => a + w.distanceMeters / 1000, 0) * 10) / 10,
    hours: Math.round((recentWorkouts.reduce((a, w) => a + w.movingSeconds, 0) / 3600) * 10) / 10,
    stravaConnected: recentWorkouts.some((w) => w.source === "STRAVA"),
  };

  return res.json({
    user: { name: user.name, bio: user.bio, city: user.city, uf: user.uf, slug: user.slug, since: user.createdAt },
    stats: { totalRaces, totalKm, prs },
    badges,
    evolucao,
    trainingLast30,
    results,
  });
});

// === Endpoints autenticados para o próprio usuário gerenciar perfil ===

const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(280).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  uf: z.string().length(2).optional().nullable(),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen.")
    .optional(),
  publicProfile: z.boolean().optional(),
});

// GET /me/profile — dados editáveis
publicProfilesRouter.get(
  "/me/profile",
  requireAuth,
  allowRoles(Role.corredor),
  async (req: AuthenticatedRequest, res) => {
    let user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        name: true,
        email: true,
        bio: true,
        city: true,
        uf: true,
        slug: true,
        publicProfile: true,
        document: true,
      },
    });
    // Se ainda não tem slug, gera um sugerido
    if (user && !user.slug) {
      const base = slugify(user.name) || "atleta";
      let candidate = base;
      let i = 0;
      while (await prisma.user.findUnique({ where: { slug: candidate } })) {
        i += 1;
        candidate = `${base}-${i}`;
      }
      await prisma.user.update({ where: { id: req.user!.id }, data: { slug: candidate } });
      user = { ...user, slug: candidate };
    }
    return res.json(user);
  }
);

// PUT /me/profile — atualizar
publicProfilesRouter.put(
  "/me/profile",
  requireAuth,
  allowRoles(Role.corredor),
  async (req: AuthenticatedRequest, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Dados inválidos.", errors: parsed.error.format() });
    }
    const { slug, ...rest } = parsed.data;
    if (slug) {
      const existing = await prisma.user.findUnique({ where: { slug } });
      if (existing && existing.id !== req.user!.id) {
        return res.status(409).json({ message: "Esse link já está em uso. Tente outro." });
      }
    }
    const data: Record<string, unknown> = { ...rest };
    if (slug) data.slug = slug;
    if (rest.uf) data.uf = String(rest.uf).toUpperCase();
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: { name: true, bio: true, city: true, uf: true, slug: true, publicProfile: true },
    });
    return res.json(updated);
  }
);
