// @ts-nocheck
import { Router } from "express";
import { Gender, PaymentStatus, RegistrationStatus, Role } from "../../types/enums";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { allowRoles, AuthenticatedRequest, requireAuth } from "../../middlewares/auth";
import { calculateAgeForEvent } from "../../utils/time";
import { nextBib } from "../../utils/bib";

const registrationSchema = z.object({
  categoryId: z.string().min(1),
});

export const registrationsRouter = Router();

registrationsRouter.post(
  "/events/:id/register",
  requireAuth,
  allowRoles(Role.corredor),
  async (req: AuthenticatedRequest, res) => {
    const payload = registrationSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ message: "Dados inválidos." });
    }

    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    const category = await prisma.category.findUnique({ where: { id: payload.data.categoryId } });
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!event || !category || !user) {
      return res.status(404).json({ message: "Evento/categoria não encontrados." });
    }

    if (category.eventId !== event.id) {
      return res.status(400).json({ message: "Categoria inválida para este evento." });
    }

    if (!user.birthDate) {
      return res.status(400).json({ message: "Data de nascimento obrigatória para inscrição." });
    }

    const age = calculateAgeForEvent(event.date, user.birthDate);
    if (age < category.minAge || age > category.maxAge) {
      return res.status(400).json({ message: "Faixa etária não permitida para esta categoria." });
    }

    if (category.gender !== Gender.ANY && user.document && !["M", "F"].includes(category.gender)) {
      return res.status(400).json({ message: "Categoria incompatível com gênero." });
    }

    const eventRegistrationsCount = await prisma.registration.count({ where: { eventId: event.id } });
    if (eventRegistrationsCount >= event.slots) {
      return res.status(400).json({ message: "Evento sem vagas." });
    }

    if (category.maxSlots) {
      const categoryCount = await prisma.registration.count({ where: { categoryId: category.id } });
      if (categoryCount >= category.maxSlots) {
        return res.status(400).json({ message: "Categoria sem vagas." });
      }
    }

    try {
      const registration = await prisma.$transaction(async (tx) => {
        const createdRegistration = await tx.registration.create({
          data: {
            userId: req.user!.id,
            eventId: event.id,
            categoryId: category.id,
            status: RegistrationStatus.PENDING,
          },
        });

        const payment = await tx.payment.create({
          data: {
            registrationId: createdRegistration.id,
            method: "stripe",
            amount: category.price,
            status: PaymentStatus.PENDING,
          },
        });

        return tx.registration.update({
          where: { id: createdRegistration.id },
          data: { paymentId: payment.id },
          include: { payment: true },
        });
      });

      return res.status(201).json(registration);
    } catch {
      return res.status(409).json({ message: "Você já está inscrito neste evento." });
    }
  },
);

registrationsRouter.get(
  "/registrations/me",
  requireAuth,
  allowRoles(Role.corredor),
  async (req: AuthenticatedRequest, res) => {
    const registrations = await prisma.registration.findMany({
      where: { userId: req.user!.id },
      include: {
        event: true,
        category: true,
        payment: true,
        timingResult: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(registrations);
  },
);

registrationsRouter.get(
  "/events/:id/registrations",
  requireAuth,
  allowRoles(Role.admin),
  async (req, res) => {
    const registrations = await prisma.registration.findMany({
      where: { eventId: req.params.id },
      include: { user: true, category: true, payment: true, timingResult: true },
      orderBy: { createdAt: "asc" },
    });
    return res.json(registrations);
  },
);

registrationsRouter.post(
  "/events/:id/bibs/generate",
  requireAuth,
  allowRoles(Role.admin),
  async (req, res) => {
    const generated = await prisma.$transaction(async (tx) => {
      const registrations = await tx.registration.findMany({
        where: {
          eventId: req.params.id,
          status: RegistrationStatus.CONFIRMED,
          bibNumber: null,
        },
        orderBy: { createdAt: "asc" },
      });

      const used = await tx.registration.findMany({
        where: { eventId: req.params.id, bibNumber: { not: null } },
        select: { bibNumber: true },
      });

      const bibs = used.map((item) => item.bibNumber!).filter(Boolean);
      const updates = [];

      for (const registration of registrations) {
        const bib = nextBib(bibs);
        bibs.push(bib);
        updates.push(
          tx.registration.update({
            where: { id: registration.id },
            data: { bibNumber: bib },
          }),
        );
      }

      return Promise.all(updates);
    });

    return res.json({ generated: generated.length });
  },
);

registrationsRouter.post(
  "/events/:id/checkin",
  requireAuth,
  allowRoles(Role.admin, Role.operador),
  async (req, res) => {
    const registrationId = z.object({ registrationId: z.string() }).safeParse(req.body);
    if (!registrationId.success) {
      return res.status(400).json({ message: "Dados inválidos." });
    }

    const registration = await prisma.registration.update({
      where: { id: registrationId.data.registrationId, eventId: req.params.id },
      data: { status: RegistrationStatus.CHECKED_IN },
    });

    return res.json(registration);
  },
);
