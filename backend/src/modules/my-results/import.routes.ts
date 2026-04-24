// @ts-nocheck
import { Router } from "express";
import multer from "multer";
import { createWorker } from "tesseract.js";
// pdf-parse v2 expõe a classe PDFParse
const { PDFParse } = require("pdf-parse");
import { Role } from "../../types/enums";
import { allowRoles, AuthenticatedRequest, requireAuth } from "../../middlewares/auth";
import { extractResultFromText } from "../../services/certificate-parser";

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
