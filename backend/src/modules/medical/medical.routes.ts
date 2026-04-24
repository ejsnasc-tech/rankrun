// @ts-nocheck
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { AuthenticatedRequest, requireAuth } from "../../middlewares/auth";

export const medicalRouter = Router();

medicalRouter.put("/me/medical-info", requireAuth, async (req: AuthenticatedRequest, res) => {
  const payload = z
    .object({
      allergies: z.string().optional(),
      conditions: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
    })
    .safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const medicalInfo = await prisma.medicalInfo.upsert({
    where: { userId: req.user!.id },
    create: { userId: req.user!.id, ...payload.data },
    update: payload.data,
  });

  return res.json(medicalInfo);
});
