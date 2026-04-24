// @ts-nocheck
import { Router } from "express";
import { PaymentStatus, RegistrationStatus } from "../../types/enums";
import Stripe from "stripe";
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { requireAuth } from "../../middlewares/auth";
import { stripe } from "../../lib/stripe";

const paymentCheckoutSchema = z.object({
  registrationId: z.string().min(1),
  method: z.string().default("stripe"),
});

export const paymentsRouter = Router();

paymentsRouter.post("/checkout", requireAuth, async (req, res) => {
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

paymentsRouter.post("/webhook", async (req, res) => {
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
