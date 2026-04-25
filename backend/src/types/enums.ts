// Replacement for Prisma-generated enums (SQLite doesn't support enums).

export const Role = {
  corredor: "corredor",
  operador: "operador",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ResultSource = {
  MANUAL: "MANUAL",
  IMPORTED: "IMPORTED",
  MATCHED: "MATCHED",
  TIMING: "TIMING",
  LATEMP: "LATEMP",
} as const;
export type ResultSource = (typeof ResultSource)[keyof typeof ResultSource];
