// @ts-nocheck
import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { ResultStatus } from "../../types/enums";
import { prisma } from "../../prisma/client";
import { formatDuration, formatPace, SplitPayload } from "../../utils/time";

export const resultsRouter = Router();

resultsRouter.get("/events/:id/results", async (req, res) => {
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

resultsRouter.get("/results/:registrationId", async (req, res) => {
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

resultsRouter.get("/results/:registrationId/certificate", async (req, res) => {
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
