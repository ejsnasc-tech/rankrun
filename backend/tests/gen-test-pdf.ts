// Gera um PDF de teste com PDFKit para validar /me/results/import
// (PDFs com texto puro evitam o OCR e usam pdf-parse).
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const out = path.resolve(__dirname, "certificado-teste.pdf");
const doc = new PDFDocument();
doc.pipe(fs.createWriteStream(out));

doc.fontSize(20).text("CERTIFICADO DE CONCLUSAO", { align: "center" });
doc.moveDown();
doc.fontSize(16).text("Maratona do Rio 2025");
doc.fontSize(12).text("Rio de Janeiro - RJ");
doc.text("Data: 15/06/2025");
doc.text("Distancia: 42K");
doc.moveDown();
doc.text("Atleta: Corredor Teste");
doc.text("Tempo Liquido: 03:58:12");
doc.text("Classificacao Geral: 1234");
doc.text("Categoria: M30-34");
doc.end();

console.log("PDF gerado:", out);
