import { extractResultFromText } from "../src/services/certificate-parser";

const sample = `
CERTIFICADO DE CONCLUSÃO

Maratona do Rio 2025
Rio de Janeiro - RJ
Data: 15/06/2025
Distância: 42K

Atleta: Corredor Teste
Tempo Líquido: 03:58:12
Classificação Geral: 1234
Categoria: M30-34
`;

const result = extractResultFromText(sample);
console.log(JSON.stringify(result, null, 2));
