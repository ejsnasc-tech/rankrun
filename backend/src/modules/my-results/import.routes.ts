// @ts-nocheck
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { createWorker } from "tesseract.js";
// pdf-parse v2 expõe a classe PDFParse
const { PDFParse } = require("pdf-parse");
import { Role } from "../../types/enums";
import { allowRoles, AuthenticatedRequest, requireAuth } from "../../middlewares/auth";
import { extractResultFromText } from "../../services/certificate-parser";
import { lookupResult } from "../../services/results-lookup";
import { prisma } from "../../prisma/client";

export const importRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

/**
 * POST /me/results/import
 * multipart/form-data com campo "file" (jpg/png/pdf)
 * Faz OCR e devolve um rascunho preenchido (não persiste).
 */
importRouter.post(
  "/import",
  requireAuth,
  allowRoles(Role.corredor),
  upload.single("file"),
  async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Envie um arquivo no campo 'file'." });
    }

    const { mimetype, buffer, originalname } = req.file;
    let rawText = "";

    try {
      if (mimetype === "application/pdf") {
        const parser = new PDFParse({ data: buffer });
        const parsed = await parser.getText();
        rawText = parsed.text || "";
        // Se PDF for só imagem (sem texto extraível), avisa
        if (rawText.trim().length < 20) {
          return res.status(422).json({
            message: "PDF sem texto extraível. Envie como imagem (JPG/PNG) para usarmos OCR.",
          });
        }
      } else if (mimetype.startsWith("image/")) {
        const worker = await createWorker("por");
        const { data } = await worker.recognize(buffer);
        rawText = data.text || "";
        await worker.terminate();
      } else {
        return res.status(415).json({ message: `Tipo de arquivo não suportado: ${mimetype}` });
      }
    } catch (err: any) {
      console.error("OCR/Parse error:", err);
      return res.status(500).json({ message: "Falha ao processar o arquivo.", detail: err.message });
    }

    const extracted = extractResultFromText(rawText);

    return res.json({
      filename: originalname,
      ...extracted,
    });
  }
);

/**
 * POST /me/results/lookup
 * { raceCatalogId, bib?, useMyCpf? }
 * Busca resultado oficial em base mock (futuramente: scrapers reais).
 * Se useMyCpf, usa o documento do usuário autenticado.
 */
const lookupSchema = z.object({
  raceCatalogId: z.string().min(1),
  bib: z.string().optional(),
  useMyCpf: z.boolean().optional(),
});

importRouter.post(
  "/lookup",
  requireAuth,
  allowRoles(Role.corredor),
  async (req: AuthenticatedRequest, res) => {
    const parsed = lookupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Dados inválidos.", errors: parsed.error.format() });
    }

    let cpf: string | undefined;
    if (parsed.data.useMyCpf) {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      cpf = user?.document ?? undefined;
      if (!cpf) {
        return res.status(400).json({
          message: "Você ainda não cadastrou seu CPF no perfil. Cadastre ou informe o número de peito.",
        });
      }
    }

    const result = lookupResult(parsed.data.raceCatalogId, { cpf, bib: parsed.data.bib });

    if (!result) {
      return res.status(404).json({
        message: "Não encontramos seu resultado nesta prova ainda.",
        hint: "Confira no site oficial da prova ou importe seu certificado.",
      });
    }

    return res.json(result);
  }
);
