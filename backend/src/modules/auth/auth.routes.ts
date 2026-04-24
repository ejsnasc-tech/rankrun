// @ts-nocheck
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { AuthenticatedRequest, requireAuth } from "../../middlewares/auth";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  document: z.string().optional(),
  birthDate: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const payload = registerSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Dados inválidos.", errors: payload.error.flatten() });
  }

  const exists = await prisma.user.findUnique({ where: { email: payload.data.email } });
  if (exists) {
    return res.status(409).json({ message: "E-mail já cadastrado." });
  }

  const passwordHash = await bcrypt.hash(payload.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: payload.data.name,
      email: payload.data.email,
      passwordHash,
      role: Role.corredor,
      phone: payload.data.phone,
      document: payload.data.document,
      birthDate: payload.data.birthDate ? new Date(payload.data.birthDate) : null,
    },
  });

  return res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

authRouter.post("/login", async (req, res) => {
  const payload = loginSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const user = await prisma.user.findUnique({ where: { email: payload.data.email } });
  if (!user) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  const validPassword = await bcrypt.compare(payload.data.password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  const token = jwt.sign({ role: user.role }, process.env.JWT_SECRET || "changeme", {
    subject: user.id,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  return res.json({ token });
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { medicalInfo: true },
  });
  return res.json(user);
});
