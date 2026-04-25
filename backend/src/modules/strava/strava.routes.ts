import { Router } from "express";
import { prisma } from "../../prisma/client";
import { requireAuth, AuthenticatedRequest } from "../../middlewares/auth";

export const stravaRouter = Router();

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = process.env.STRAVA_REDIRECT_URI || "http://localhost:3333/auth/strava/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const isMockMode = !CLIENT_ID || !CLIENT_SECRET;

// ---------- Status ----------
stravaRouter.get("/me/strava/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { stravaAthleteId: true, stravaConnectedAt: true, stravaLastSyncAt: true },
  });
  res.json({
    connected: Boolean(user?.stravaAthleteId),
    athleteId: user?.stravaAthleteId ?? null,
    connectedAt: user?.stravaConnectedAt,
    lastSyncAt: user?.stravaLastSyncAt,
    mockMode: isMockMode,
  });
});

// ---------- Connect (start OAuth) ----------
stravaRouter.post("/me/strava/connect", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (isMockMode) {
    // Modo mock: já conecta direto, sem redirecionar
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        stravaAthleteId: `mock-${req.user!.id.slice(0, 6)}`,
        stravaAccessToken: "mock-token",
        stravaConnectedAt: new Date(),
      },
    });
    return res.json({ mockMode: true, connected: true });
  }
  // OAuth real
  const state = req.user!.id; // simples; em produção: assinar/verificar
  const scope = "read,activity:read";
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", CLIENT_ID!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  res.json({ authorizeUrl: url.toString() });
});

// ---------- Disconnect ----------
stravaRouter.post("/me/strava/disconnect", requireAuth, async (req: AuthenticatedRequest, res) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      stravaAthleteId: null,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaExpiresAt: null,
      stravaConnectedAt: null,
    },
  });
  res.json({ disconnected: true });
});

// ---------- OAuth callback (real) ----------
stravaRouter.get("/auth/strava/callback", async (req, res) => {
  if (isMockMode) {
    return res.redirect(`${FRONTEND_URL}/app/treinos?strava=mock`);
  }
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/app/treinos?strava=error`);
  }

  try {
    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
    const data = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      athlete: { id: number };
    };

    await prisma.user.update({
      where: { id: state },
      data: {
        stravaAthleteId: String(data.athlete.id),
        stravaAccessToken: data.access_token,
        stravaRefreshToken: data.refresh_token,
        stravaExpiresAt: new Date(data.expires_at * 1000),
        stravaConnectedAt: new Date(),
      },
    });
    res.redirect(`${FRONTEND_URL}/app/treinos?strava=ok`);
  } catch {
    res.redirect(`${FRONTEND_URL}/app/treinos?strava=error`);
  }
});

// ---------- Refresh token helper ----------
async function ensureValidToken(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stravaRefreshToken) return user;
  if (user.stravaExpiresAt && user.stravaExpiresAt.getTime() > Date.now() + 60_000) return user;
  if (isMockMode) return user;

  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: user.stravaRefreshToken,
    }),
  });
  if (!r.ok) return user;
  const data = (await r.json()) as { access_token: string; refresh_token: string; expires_at: number };
  return prisma.user.update({
    where: { id: userId },
    data: {
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      stravaExpiresAt: new Date(data.expires_at * 1000),
    },
  });
}

// ---------- Sync ----------
stravaRouter.post("/me/strava/sync", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await ensureValidToken(req.user!.id);
  if (!user?.stravaAthleteId) return res.status(400).json({ message: "Strava não conectado." });

  if (isMockMode) {
    // Gera 5 atividades fictícias (últimos 14 dias)
    const today = new Date();
    const samples = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 3);
      const km = 5 + Math.floor(Math.random() * 8);
      const paceSec = 5 * 60 + Math.floor(Math.random() * 60); // ~5:00-6:00 /km
      return {
        externalId: `mock-${d.getTime()}`,
        type: "RUN",
        name: `Treino ${i + 1}`,
        startedAt: d,
        distanceMeters: km * 1000,
        movingSeconds: km * paceSec,
        elevationGain: Math.random() * 80,
      };
    });
    let imported = 0;
    for (const s of samples) {
      try {
        await prisma.workout.create({
          data: { ...s, userId: user.id, source: "STRAVA" },
        });
        imported += 1;
      } catch {
        /* duplicada */
      }
    }
    await prisma.user.update({ where: { id: user.id }, data: { stravaLastSyncAt: new Date() } });
    return res.json({ imported, mockMode: true });
  }

  // Real: fetch atividades recentes
  const after = user.stravaLastSyncAt ? Math.floor(user.stravaLastSyncAt.getTime() / 1000) : Math.floor((Date.now() - 90 * 86400_000) / 1000);
  let imported = 0;
  try {
    const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=100&after=${after}`, {
      headers: { Authorization: `Bearer ${user.stravaAccessToken}` },
    });
    if (!r.ok) return res.status(502).json({ message: "Falha ao buscar atividades no Strava." });
    const activities = (await r.json()) as Array<{
      id: number;
      name: string;
      type: string;
      start_date: string;
      distance: number;
      moving_time: number;
      total_elevation_gain?: number;
      average_heartrate?: number;
    }>;
    for (const a of activities) {
      try {
        await prisma.workout.create({
          data: {
            userId: user.id,
            source: "STRAVA",
            externalId: String(a.id),
            type: a.type === "Ride" ? "RIDE" : a.type === "Swim" ? "SWIM" : a.type === "Walk" ? "WALK" : a.type === "Run" ? "RUN" : "OTHER",
            name: a.name,
            startedAt: new Date(a.start_date),
            distanceMeters: Math.round(a.distance),
            movingSeconds: a.moving_time,
            elevationGain: a.total_elevation_gain ?? null,
            averageHeartRate: a.average_heartrate ?? null,
          },
        });
        imported += 1;
      } catch {
        /* duplicada */
      }
    }
    await prisma.user.update({ where: { id: user.id }, data: { stravaLastSyncAt: new Date() } });
    res.json({ imported, mockMode: false });
  } catch {
    res.status(502).json({ message: "Erro ao sincronizar com o Strava." });
  }
});
