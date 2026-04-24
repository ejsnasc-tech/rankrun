// @ts-nocheck
import { Router } from "express";
import { Gender, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { allowRoles, requireAuth } from "../../middlewares/auth";

const categorySchema = z.object({
  name: z.string().min(2),
  minAge: z.number().int().nonnegative(),
  maxAge: z.number().int().nonnegative(),
  gender: z.nativeEnum(Gender),
  price: z.number().nonnegative(),
  maxSlots: z.number().int().positive().optional(),
});

// Mounted at root because routes are split between /events/:id/categories and /categories/:id
export const categoriesRouter = Router();

categoriesRouter.get("/events/:id/categories", async (req, res) => {
  const categories = await prisma.category.findMany({ where: { eventId: req.params.id } });
  return res.json(categories);
});

categoriesRouter.post("/events/:id/categories", requireAuth, allowRoles(Role.admin), async (req, res) => {
  const payload = categorySchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const category = await prisma.category.create({
    data: {
      ...payload.data,
      eventId: req.params.id,
      price: payload.data.price,
    },
  });

  return res.status(201).json(category);
});

categoriesRouter.put("/categories/:id", requireAuth, allowRoles(Role.admin), async (req, res) => {
  const payload = categorySchema.partial().safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: payload.data,
  });

  return res.json(category);
});

categoriesRouter.delete("/categories/:id", requireAuth, allowRoles(Role.admin), async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});
