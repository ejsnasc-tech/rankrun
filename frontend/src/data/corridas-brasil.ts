// Catálogo curado de corridas de rua brasileiras + grandes corridas mundiais.
// FONTE DE VERDADE: src/data/catalogo-corridas.json
//
// Atualizado semanalmente via GitHub Action (.github/workflows/atualizar-catalogo.yml)
// que abre PR toda segunda-feira marcando provas passadas e pedindo revisão humana
// para confirmar datas/abertura de inscrição.
import catalogo from "./catalogo-corridas.json";

export type StatusInscricao = "abertas" | "em-breve" | "encerradas";

export type CorridaCatalogo = {
  id: string;
  titulo: string;
  cidade: string;
  uf: string;
  pais: string; // BR, US, DE, AR ...
  data: string; // ISO yyyy-mm-dd
  distancias: string[];
  organizador: string;
  status: StatusInscricao;
  linkOficial: string;
  destaque?: boolean;
  observacao?: string;
};

export const corridasBrasil: CorridaCatalogo[] = catalogo.corridas as CorridaCatalogo[];
export const catalogoAtualizadoEm: string = catalogo.atualizadoEm;

export function ordenarPorData(lista: CorridaCatalogo[]): CorridaCatalogo[] {
  return [...lista].sort((a, b) => a.data.localeCompare(b.data));
}

export function filtrarAbertas(lista: CorridaCatalogo[]): CorridaCatalogo[] {
  return lista.filter((c) => c.status === "abertas" || c.status === "em-breve");
}
