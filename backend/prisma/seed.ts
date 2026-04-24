import { PrismaClient } from "@prisma/client";
import { EventStatus, Gender, RegistrationStatus, PaymentStatus, CheckpointType, ResultStatus, Role } from "../src/types/enums";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const runnerPassword = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@corridasderua.com" },
    update: {},
    create: {
      name: "Admin Corridas",
      email: "admin@corridasderua.com",
      passwordHash: adminPassword,
      role: Role.admin,
      birthDate: new Date("1985-01-01"),
      document: "00000000000",
      phone: "11999990000",
    },
  });

  const corredor = await prisma.user.upsert({
    where: { email: "corredor@teste.com" },
    update: {
      slug: "corredor-teste",
      bio: "Corredor amador. Buscando o sub-3:30 na maratona.",
      city: "Aracaju",
      uf: "SE",
      publicProfile: true,
    },
    create: {
      name: "Corredor Teste",
      email: "corredor@teste.com",
      passwordHash: runnerPassword,
      role: Role.corredor,
      birthDate: new Date("1994-06-15"),
      document: "11111111111",
      phone: "11911112222",
      slug: "corredor-teste",
      bio: "Corredor amador. Buscando o sub-3:30 na maratona.",
      city: "Aracaju",
      uf: "SE",
      publicProfile: true,
    },
  });

  const event = await prisma.event.upsert({
    where: { slug: "corrida-teste-5k" },
    update: {},
    create: {
      title: "Corrida Teste 5K",
      slug: "corrida-teste-5k",
      date: new Date(new Date().setDate(new Date().getDate() + 15)),
      location: "São Paulo - SP",
      distanceMeters: 5000,
      slots: 500,
      description: "Evento seed para testes do sistema.",
      status: EventStatus.PUBLISHED,
      organizerId: admin.id,
    },
  });

  const maleCategory = await prisma.category.upsert({
    where: { id: `seed-male-${event.id}` },
    update: {},
    create: {
      id: `seed-male-${event.id}`,
      eventId: event.id,
      name: "Geral M",
      minAge: 16,
      maxAge: 99,
      gender: Gender.M,
      price: 89.9,
      maxSlots: 250,
    },
  });

  await prisma.category.upsert({
    where: { id: `seed-female-${event.id}` },
    update: {},
    create: {
      id: `seed-female-${event.id}`,
      eventId: event.id,
      name: "Geral F",
      minAge: 16,
      maxAge: 99,
      gender: Gender.F,
      price: 89.9,
      maxSlots: 250,
    },
  });

  const checkpoints = [
    { name: "Largada", kmMark: 0, type: CheckpointType.START, order: 1 },
    { name: "Km 1", kmMark: 1, type: CheckpointType.SPLIT, order: 2 },
    { name: "Km 2", kmMark: 2, type: CheckpointType.SPLIT, order: 3 },
    { name: "Km 3", kmMark: 3, type: CheckpointType.SPLIT, order: 4 },
    { name: "Km 4", kmMark: 4, type: CheckpointType.SPLIT, order: 5 },
    { name: "Chegada", kmMark: 5, type: CheckpointType.FINISH, order: 6 },
  ];

  for (const checkpoint of checkpoints) {
    await prisma.checkpoint.upsert({
      where: { eventId_order: { eventId: event.id, order: checkpoint.order } },
      update: checkpoint,
      create: { ...checkpoint, eventId: event.id },
    });
  }

  const registration = await prisma.registration.upsert({
    where: { userId_eventId: { userId: corredor.id, eventId: event.id } },
    update: {
      categoryId: maleCategory.id,
      status: RegistrationStatus.CONFIRMED,
      bibNumber: 1,
    },
    create: {
      userId: corredor.id,
      eventId: event.id,
      categoryId: maleCategory.id,
      status: RegistrationStatus.CONFIRMED,
      bibNumber: 1,
    },
  });

  const payment = await prisma.payment.upsert({
    where: { registrationId: registration.id },
    update: { status: PaymentStatus.PAID, method: "stripe", amount: 89.9, transactionId: "seed_tx" },
    create: {
      registrationId: registration.id,
      method: "stripe",
      amount: 89.9,
      status: PaymentStatus.PAID,
      transactionId: "seed_tx",
      gatewayPayload: JSON.stringify({ source: "seed" }),
    },
  });

  await prisma.registration.update({
    where: { id: registration.id },
    data: { paymentId: payment.id },
  });

  const seedSplits = [
    { checkpointId: "start", kmMark: 0, timestamp: new Date("2026-01-01T07:00:00Z").toISOString(), splitDuration: 0, paceSecondsPerKm: 0 },
    { checkpointId: "km1", kmMark: 1, timestamp: new Date("2026-01-01T07:04:30Z").toISOString(), splitDuration: 270, paceSecondsPerKm: 270 },
    { checkpointId: "km2", kmMark: 2, timestamp: new Date("2026-01-01T07:09:00Z").toISOString(), splitDuration: 270, paceSecondsPerKm: 270 },
    { checkpointId: "km3", kmMark: 3, timestamp: new Date("2026-01-01T07:13:45Z").toISOString(), splitDuration: 285, paceSecondsPerKm: 285 },
    { checkpointId: "km4", kmMark: 4, timestamp: new Date("2026-01-01T07:18:20Z").toISOString(), splitDuration: 275, paceSecondsPerKm: 275 },
    { checkpointId: "finish", kmMark: 5, timestamp: new Date("2026-01-01T07:23:00Z").toISOString(), splitDuration: 280, paceSecondsPerKm: 280 },
  ];

  await prisma.timingResult.upsert({
    where: { registrationId: registration.id },
    update: {
      bibNumber: 1,
      chipId: "seed-chip-1",
      status: ResultStatus.FINISHED,
      gunTime: new Date(seedSplits[0].timestamp),
      netTime: new Date(seedSplits[seedSplits.length - 1].timestamp),
      generalRank: 1,
      categoryRank: 1,
      splits: JSON.stringify(seedSplits),
    },
    create: {
      registrationId: registration.id,
      bibNumber: 1,
      chipId: "seed-chip-1",
      status: ResultStatus.FINISHED,
      gunTime: new Date(seedSplits[0].timestamp),
      netTime: new Date(seedSplits[seedSplits.length - 1].timestamp),
      generalRank: 1,
      categoryRank: 1,
      splits: JSON.stringify(seedSplits),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
