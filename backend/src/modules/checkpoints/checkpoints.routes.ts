// @ts-nocheck
import { Router } from "express";
import { CheckpointType, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { allowRoles, requireAuth } from "../../middlewares/auth";

const checkpointSchema = z.object({
  name: z.string().min(2),
  kmMark: z.number().nonnegative(),
  type: z.nativeEnum(CheckpointType),
  order: z.number().int().nonnegative(),
});

export const checkpointsRouter = Router();

checkpointsRouter.get("/events/:id/checkpoints", async (req, res) => {
  const checkpoints = await prisma.checkpoint.findMany({
    where: { eventId: req.params.id },
    orderBy: { order: "asc" },
  });
  return res.json(checkpoints);
});

checkpointsRouter.post("/events/:id/checkpoints", requireAuth, allowRoles(Role.admin), async (req, res) => {
  const payload = checkpointSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const checkpoint = await prisma.checkpoint.create({
    data: {
      ...payload.data,
      eventId: req.params.id,
    },
  });

  return res.status(201).json(checkpoint);
});
