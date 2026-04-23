// @ts-nocheck
import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import {
  AppealStatus,
  CheckpointType,
  EventStatus,
  Gender,
  PaymentStatus,
  RegistrationStatus,
  ResultStatus,
  Role,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "./prisma/client";
import { allowRoles, AuthenticatedRequest, requireAuth } from "./middlewares/auth";
import { calculateAgeForEvent, calculateSplitMetrics, formatDuration, formatPace, SplitPayload } from "./utils/time";
import { nextBib } from "./utils/bib";
import { rankEntries } from "./utils/ranking";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

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

const categorySchema = z.object({
  name: z.string().min(2),
  minAge: z.number().int().nonnegative(),
  maxAge: z.number().int().nonnegative(),
  gender: z.nativeEnum(Gender),
  price: z.number().nonnegative(),
  maxSlots: z.number().int().positive().optional(),
});

const checkpointSchema = z.object({
  name: z.string().min(2),
  kmMark: z.number().nonnegative(),
  type: z.nativeEnum(CheckpointType),
  order: z.number().int().nonnegative(),
});

const registrationSchema = z.object({
  categoryId: z.string().min(1),
});

const paymentCheckoutSchema = z.object({
  registrationId: z.string().min(1),
  method: z.string().default("stripe"),
});

const timingSchema = z.object({
  chip_id: z.string().optional(),
  bib_number: z.number().int().positive(),
  timestamp: z.string(),
  checkpoint_id: z.string().min(1),
});

async function recalculateEventRanks(eventId: string) {
  const results = await prisma.timingResult.findMany({
    where: { registration: { eventId } },
    include: { registration: true },
  });

  const ranking = rankEntries(
    results.map((result) => {
      const splits = (result.splits as SplitPayload[] | null) ?? [];
      const startSplit = splits.find((split) => split.splitDuration === 0);
      const finishSplit = splits.at(-1);
      const netSeconds = startSplit && finishSplit ? Math.floor((new Date(finishSplit.timestamp).getTime() - new Date(startSplit.timestamp).getTime()) / 1000) : null;

      return {
        registrationId: result.registrationId,
        categoryId: result.registration.categoryId,
        status: result.status,
        netSeconds,
        lastSplitAt: finishSplit?.timestamp ?? null,
      };
    }),
  );

  await Promise.all(
    results.map((result) => {
      const data = ranking.get(result.registrationId);
      return prisma.timingResult.update({
        where: { id: result.id },
        data: {
          generalRank: data?.generalRank ?? null,
          categoryRank: data?.categoryRank ?? null,
        },
      });
    }),
  );
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/certificates", express.static(path.resolve(process.cwd(), "src/uploads/certificates")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/auth/register", async (req, res) => {
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

  app.post("/auth/login", async (req, res) => {
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

  app.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { medicalInfo: true },
    });

    return res.json(user);
  });

  app.get("/events", async (_req, res) => {
    const events = await prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      include: { categories: true },
      orderBy: { date: "asc" },
    });
    return res.json(events);
  });

  app.get("/events/:id", async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { categories: true, checkpoints: true },
    });
    if (!event) {
      return res.status(404).json({ message: "Evento não encontrado." });
    }
    return res.json(event);
  });

  app.post("/events", requireAuth, allowRoles(Role.admin), async (req: AuthenticatedRequest, res) => {
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

  app.put("/events/:id", requireAuth, allowRoles(Role.admin), async (req, res) => {
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

  app.delete("/events/:id", requireAuth, allowRoles(Role.admin), async (req, res) => {
    await prisma.event.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  });

  app.get("/events/:id/categories", async (req, res) => {
    const categories = await prisma.category.findMany({ where: { eventId: req.params.id } });
    return res.json(categories);
  });

  app.post("/events/:id/categories", requireAuth, allowRoles(Role.admin), async (req, res) => {
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

  app.put("/categories/:id", requireAuth, allowRoles(Role.admin), async (req, res) => {
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

  app.delete("/categories/:id", requireAuth, allowRoles(Role.admin), async (req, res) => {
    await prisma.category.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  });

  app.get("/events/:id/checkpoints", async (req, res) => {
    const checkpoints = await prisma.checkpoint.findMany({
      where: { eventId: req.params.id },
      orderBy: { order: "asc" },
    });
    return res.json(checkpoints);
  });

  app.post("/events/:id/checkpoints", requireAuth, allowRoles(Role.admin), async (req, res) => {
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

  app.post("/events/:id/register", requireAuth, allowRoles(Role.corredor), async (req: AuthenticatedRequest, res) => {
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
  });

  app.get("/registrations/me", requireAuth, allowRoles(Role.corredor), async (req: AuthenticatedRequest, res) => {
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
  });

  app.get("/events/:id/registrations", requireAuth, allowRoles(Role.admin), async (req, res) => {
    const registrations = await prisma.registration.findMany({
      where: { eventId: req.params.id },
      include: { user: true, category: true, payment: true, timingResult: true },
      orderBy: { createdAt: "asc" },
    });
    return res.json(registrations);
  });

  app.post("/events/:id/bibs/generate", requireAuth, allowRoles(Role.admin), async (req, res) => {
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
  });

  app.post("/events/:id/checkin", requireAuth, allowRoles(Role.admin, Role.operador), async (req, res) => {
    const registrationId = z.object({ registrationId: z.string() }).safeParse(req.body);
    if (!registrationId.success) {
      return res.status(400).json({ message: "Dados inválidos." });
    }

    const registration = await prisma.registration.update({
      where: { id: registrationId.data.registrationId, eventId: req.params.id },
      data: { status: RegistrationStatus.CHECKED_IN },
    });

    return res.json(registration);
  });

  app.post("/payments/checkout", requireAuth, async (req, res) => {
    const payload = paymentCheckoutSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ message: "Dados inválidos." });
    }

    const payment = await prisma.payment.findFirst({
      where: { registrationId: payload.data.registrationId },
      include: { registration: { include: { event: true } } },
    });

    if (!payment) {
      return res.status(404).json({ message: "Pagamento não encontrado." });
    }

    if (!stripe) {
      return res.json({ sessionId: `mock_${payment.id}` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: Math.round(Number(payment.amount) * 100),
            product_data: {
              name: `Inscrição - ${payment.registration.event.title}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/app/minhas-provas`,
      cancel_url: `${process.env.FRONTEND_URL}/eventos/${payment.registration.event.id}`,
      metadata: {
        registrationId: payload.data.registrationId,
        paymentId: payment.id,
      },
    });

    return res.json({ sessionId: session.id, url: session.url });
  });

  app.post("/payments/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event: Stripe.Event | null = null;

    if (stripe && sig && process.env.STRIPE_WEBHOOK_SECRET) {
      try {
        event = stripe.webhooks.constructEvent(JSON.stringify(req.body), sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch {
        return res.status(400).json({ message: "Assinatura inválida." });
      }
    }

    const data = event?.type === "checkout.session.completed" ? (event.data.object as Stripe.Checkout.Session).metadata : req.body;

    const registrationId = data?.registrationId;
    if (!registrationId) {
      return res.status(400).json({ message: "registrationId ausente." });
    }

    const payment = await prisma.payment.findUnique({ where: { registrationId } });
    if (!payment) {
      return res.status(404).json({ message: "Pagamento não encontrado." });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          transactionId: data?.transactionId ?? event?.id ?? `mock_${Date.now()}`,
          gatewayPayload: req.body,
        },
      }),
      prisma.registration.update({
        where: { id: registrationId },
        data: { status: RegistrationStatus.CONFIRMED },
      }),
    ]);

    return res.json({ received: true });
  });

  app.post("/timing/webhook", async (req, res) => {
    const payload = timingSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ message: "Payload inválido." });
    }

    const checkpoint = await prisma.checkpoint.findUnique({ where: { id: payload.data.checkpoint_id } });
    if (!checkpoint) {
      return res.status(404).json({ message: "Checkpoint não encontrado." });
    }

    const registration = await prisma.registration.findFirst({
      where: {
        eventId: checkpoint.eventId,
        bibNumber: payload.data.bib_number,
      },
      include: { category: true, event: true },
    });

    if (!registration) {
      return res.status(404).json({ message: "Inscrição não encontrada para este bib." });
    }

    const result = await prisma.timingResult.upsert({
      where: { registrationId: registration.id },
      create: {
        registrationId: registration.id,
        bibNumber: payload.data.bib_number,
        chipId: payload.data.chip_id,
        splits: [],
        status: ResultStatus.DNS,
      },
      update: {
        chipId: payload.data.chip_id,
      },
    });

    const existingSplits = ((result.splits as SplitPayload[] | null) ?? []).filter(
      (item) => item.checkpointId !== checkpoint.id,
    );

    const splitTime = new Date(payload.data.timestamp);

    const previousSplit = [...existingSplits]
      .sort((a, b) => a.kmMark - b.kmMark)
      .filter((item) => item.kmMark < checkpoint.kmMark)
      .at(-1);

    const metrics = calculateSplitMetrics(
      previousSplit
        ? {
            kmMark: previousSplit.kmMark,
            timestamp: new Date(previousSplit.timestamp),
          }
        : null,
      {
        kmMark: checkpoint.kmMark,
        timestamp: splitTime,
      },
    );

    const nextSplit: SplitPayload = {
      checkpointId: checkpoint.id,
      kmMark: checkpoint.kmMark,
      timestamp: splitTime.toISOString(),
      splitDuration: metrics.splitDuration,
      paceSecondsPerKm: metrics.paceSecondsPerKm,
    };

    const mergedSplits = [...existingSplits, nextSplit].sort((a, b) => a.kmMark - b.kmMark);

    const startSplit = mergedSplits.find((split) => split.kmMark === 0) ?? mergedSplits[0] ?? null;
    const finishSplit = mergedSplits.find((split) => split.checkpointId === checkpoint.id && checkpoint.type === CheckpointType.FINISH)
      ? nextSplit
      : mergedSplits.find((split) => split.kmMark >= registration.event.distanceMeters / 1000);

    const eventStartCheckpoint = await prisma.checkpoint.findFirst({
      where: { eventId: checkpoint.eventId, type: CheckpointType.START },
      orderBy: { order: "asc" },
    });

    const allStarts = eventStartCheckpoint
      ? await prisma.timingResult.findMany({
          where: {
            registration: { eventId: checkpoint.eventId },
            splits: { not: undefined },
          },
          select: { splits: true },
        })
      : [];

    const eventGunStartMs = allStarts
      .flatMap((row) => ((row.splits as SplitPayload[] | null) ?? []).filter((s) => s.kmMark === 0).map((s) => new Date(s.timestamp).getTime()))
      .reduce((acc, value) => (value < acc ? value : acc), Number.POSITIVE_INFINITY);

    const eventGunStart = Number.isFinite(eventGunStartMs)
      ? new Date(eventGunStartMs)
      : startSplit
        ? new Date(startSplit.timestamp)
        : null;

    const status = checkpoint.type === CheckpointType.FINISH ? ResultStatus.FINISHED : ResultStatus.DNF;

    const updated = await prisma.timingResult.update({
      where: { registrationId: registration.id },
      data: {
        splits: mergedSplits,
        status,
        gunTime: eventGunStart,
        netTime: finishSplit ? new Date(finishSplit.timestamp) : null,
      },
    });

    await recalculateEventRanks(checkpoint.eventId);

    const io = app.get("io");
    if (io) {
      io.to(`event_${checkpoint.eventId}`).emit("timing:update", {
        registrationId: registration.id,
        bibNumber: registration.bibNumber,
        status: updated.status,
      });
    }

    return res.json(updated);
  });

  app.get("/events/:id/results", async (req, res) => {
    const registrations = await prisma.registration.findMany({
      where: { eventId: req.params.id },
      include: {
        user: true,
        category: true,
        timingResult: true,
      },
    });

    const eventStarts = registrations
      .flatMap((registration) => ((registration.timingResult?.splits as SplitPayload[] | null) ?? []).filter((split) => split.kmMark === 0))
      .map((split) => new Date(split.timestamp).getTime());

    const gunStart = eventStarts.length ? Math.min(...eventStarts) : null;

    const formatted = registrations.map((registration) => {
      const splits = (registration.timingResult?.splits as SplitPayload[] | null) ?? [];
      const finish = splits.at(-1);
      const personalStart = splits.find((split) => split.kmMark === 0) ?? splits[0];
      const netSeconds = finish && personalStart ? Math.floor((new Date(finish.timestamp).getTime() - new Date(personalStart.timestamp).getTime()) / 1000) : null;
      const gunSeconds = finish && gunStart ? Math.floor((new Date(finish.timestamp).getTime() - gunStart) / 1000) : netSeconds;

      return {
        registrationId: registration.id,
        atleta: registration.user.name,
        bibNumber: registration.bibNumber,
        category: registration.category.name,
        status: registration.timingResult?.status ?? ResultStatus.DNS,
        netTime: formatDuration(netSeconds),
        gunTime: formatDuration(gunSeconds),
        generalRank: registration.timingResult?.generalRank ?? null,
        categoryRank: registration.timingResult?.categoryRank ?? null,
        splits,
      };
    });

    const general = formatted.filter((item) => item.status === ResultStatus.FINISHED);
    const others = formatted.filter((item) => item.status !== ResultStatus.FINISHED);

    return res.json({
      general: [...general, ...others],
      byCategory: Object.fromEntries(
        [...new Set(formatted.map((item) => item.category))].map((category) => [
          category,
          formatted.filter((item) => item.category === category),
        ]),
      ),
    });
  });

  app.get("/results/:registrationId", async (req, res) => {
    const registration = await prisma.registration.findUnique({
      where: { id: req.params.registrationId },
      include: {
        event: true,
        category: true,
        timingResult: true,
      },
    });

    if (!registration) {
      return res.status(404).json({ message: "Inscrição não encontrada." });
    }

    const splits = (registration.timingResult?.splits as SplitPayload[] | null) ?? [];
    const start = splits.find((split) => split.kmMark === 0) ?? splits[0];
    const finish = splits.at(-1);

    const netSeconds = start && finish ? Math.floor((new Date(finish.timestamp).getTime() - new Date(start.timestamp).getTime()) / 1000) : null;
    const gunSeconds = registration.timingResult?.gunTime && finish
      ? Math.floor((new Date(finish.timestamp).getTime() - new Date(registration.timingResult.gunTime).getTime()) / 1000)
      : netSeconds;

    return res.json({
      registrationId: registration.id,
      event: {
        id: registration.event.id,
        title: registration.event.title,
        date: registration.event.date,
        distanceMeters: registration.event.distanceMeters,
      },
      generalRank: registration.timingResult?.generalRank ?? null,
      categoryRank: registration.timingResult?.categoryRank ?? null,
      status: registration.timingResult?.status ?? ResultStatus.DNS,
      gunTime: formatDuration(gunSeconds),
      netTime: formatDuration(netSeconds),
      splits: splits.map((split) => ({
        ...split,
        pace: formatPace(split.paceSecondsPerKm),
      })),
    });
  });

  app.get("/results/:registrationId/certificate", async (req, res) => {
    const registration = await prisma.registration.findUnique({
      where: { id: req.params.registrationId },
      include: {
        user: true,
        event: true,
        category: true,
        timingResult: true,
        certificate: true,
      },
    });

    if (!registration) {
      return res.status(404).json({ message: "Inscrição não encontrada." });
    }

    if (registration.certificate) {
      return res.json(registration.certificate);
    }

    const filename = `cert-${registration.id}.pdf`;
    const outputDir = path.resolve(process.cwd(), "src/uploads/certificates");
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, filename);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", layout: "landscape" });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      doc.fontSize(26).text("Certificado de Participação", { align: "center" });
      doc.moveDown();
      doc.fontSize(18).text(`Atleta: ${registration.user.name}`, { align: "center" });
      doc.text(`Evento: ${registration.event.title}`, { align: "center" });
      doc.text(`Distância: ${registration.event.distanceMeters / 1000} km`, { align: "center" });
      doc.text(`Tempo líquido: ${registration.timingResult?.netTime ? registration.timingResult.netTime.toISOString() : "N/A"}`, {
        align: "center",
      });
      doc.text(`Posição geral: ${registration.timingResult?.generalRank ?? "N/A"}`, { align: "center" });
      doc.text(`Posição na categoria: ${registration.timingResult?.categoryRank ?? "N/A"}`, { align: "center" });
      doc.end();

      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });

    const certificate = await prisma.certificate.create({
      data: {
        registrationId: registration.id,
        url: `${process.env.BACKEND_URL || "http://localhost:3000"}/certificates/${filename}`,
      },
    });

    return res.json(certificate);
  });

  app.put("/me/medical-info", requireAuth, async (req: AuthenticatedRequest, res) => {
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

  app.post("/appeals", requireAuth, async (req, res) => {
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

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(error);
    return res.status(500).json({ message: "Erro interno do servidor." });
  });

  return app;
}
