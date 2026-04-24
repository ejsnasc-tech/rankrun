// @ts-nocheck
import { Router } from "express";
import { AppealStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { requireAuth } from "../../middlewares/auth";

export const appealsRouter = Router();

appealsRouter.post("/", requireAuth, async (req, res) => {
  const payload = z
    .object({
      registrationId: z.string(),
      type: z.string(),
      description: z.string().min(5),
    })
    .safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const appeal = await prisma.appeal.create({
    data: {
      ...payload.data,
      status: AppealStatus.OPEN,
    },
  });

  return res.status(201).json(appeal);
});
