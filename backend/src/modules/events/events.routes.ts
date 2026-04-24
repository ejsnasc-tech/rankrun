// @ts-nocheck
import { Router } from "express";
import { EventStatus, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { allowRoles, AuthenticatedRequest, requireAuth } from "../../middlewares/auth";

const eventSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  date: z.string(),
  location: z.string().min(2),
  distanceMeters: z.number().int().positive(),
  slots: z.number().int().positive(),
  description: z.string().optional(),
  status: z.nativeEnum(EventStatus).optional(),
});

export const eventsRouter = Router();

eventsRouter.get("/", async (_req, res) => {
  const events = await prisma.event.findMany({
    where: { status: EventStatus.PUBLISHED },
    include: { categories: true },
    orderBy: { date: "asc" },
  });
  return res.json(events);
});

eventsRouter.get("/:id", async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { categories: true, checkpoints: true },
  });
  if (!event) {
    return res.status(404).json({ message: "Evento não encontrado." });
  }
  return res.json(event);
});

eventsRouter.post("/", requireAuth, allowRoles(Role.admin), async (req: AuthenticatedRequest, res) => {
  const payload = eventSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const event = await prisma.event.create({
    data: {
      ...payload.data,
      date: new Date(payload.data.date),
      status: payload.data.status ?? EventStatus.DRAFT,
      organizerId: req.user!.id,
    },
  });

  return res.status(201).json(event);
});

eventsRouter.put("/:id", requireAuth, allowRoles(Role.admin), async (req, res) => {
  const payload = eventSchema.partial().safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const event = await prisma.event.update({
    where: { id: req.params.id },
    data: {
      ...payload.data,
      date: payload.data.date ? new Date(payload.data.date) : undefined,
    },
  });

  return res.json(event);
});

eventsRouter.delete("/:id", requireAuth, allowRoles(Role.admin), async (req, res) => {
  await prisma.event.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});
