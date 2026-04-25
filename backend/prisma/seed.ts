import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  const runnerPassword = await bcrypt.hash("123456", 10);

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
      role: "corredor",
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

  // Restaura resultados anteriores (se houver backup) ou cria amostra padrão.
  const backupPath = path.resolve(process.cwd(), "results-backup.json");
  if (fs.existsSync(backupPath)) {
    const rows = JSON.parse(fs.readFileSync(backupPath, "utf8")) as any[];
    for (const r of rows) {
      await prisma.result.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          userId: corredor.id,
          raceCatalogId: r.raceCatalogId ?? null,
          raceName: r.raceName,
          raceDate: new Date(r.raceDate),
          raceCity: r.raceCity ?? null,
          raceUf: r.raceUf ?? null,
          distanceMeters: r.distanceMeters,
          netTimeSeconds: r.netTimeSeconds,
          grossTimeSeconds: r.grossTimeSeconds ?? null,
          generalRank: r.generalRank ?? null,
          categoryName: r.categoryName ?? null,
          categoryRank: r.categoryRank ?? null,
          certificateUrl: r.certificateUrl ?? null,
          source: r.source ?? "MANUAL",
          notes: r.notes ?? null,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        },
      });
    }
    // eslint-disable-next-line no-console
    console.log(`[seed] restaurados ${rows.length} resultados de results-backup.json`);
  } else {
    // Amostra mínima para demos
    const samples = [
      { raceName: "Corrida do Aniversário 5K", raceDate: "2024-09-15", raceCity: "Aracaju", raceUf: "SE", distanceMeters: 5000, netTimeSeconds: 25 * 60 + 30 },
      { raceName: "Circuito Caixa 10K Aracaju", raceDate: "2025-06-08", raceCity: "Aracaju", raceUf: "SE", distanceMeters: 10000, netTimeSeconds: 53 * 60 + 15 },
      { raceName: "Meia de Itabaiana 2025", raceDate: "2025-08-24", raceCity: "Itabaiana", raceUf: "SE", distanceMeters: 21097, netTimeSeconds: 1 * 3600 + 52 * 60 + 30 },
      { raceName: "Maratona do Rio", raceDate: "2026-06-15", raceCity: "Rio de Janeiro", raceUf: "RJ", distanceMeters: 42195, netTimeSeconds: 3 * 3600 + 45 * 60 + 22 },
    ];
    for (const s of samples) {
      await prisma.result.create({
        data: { ...s, raceDate: new Date(s.raceDate), userId: corredor.id, source: "MANUAL" },
      });
    }
  }
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
