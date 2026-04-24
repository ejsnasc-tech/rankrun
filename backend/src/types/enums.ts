// Replacement for Prisma-generated enums (SQLite doesn't support enums).
// Each export mirrors the Prisma enum API (e.g. Role.admin === "admin").

export const Role = {
  admin: "admin",
  operador: "operador",
  corredor: "corredor",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const EventStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  CLOSED: "CLOSED",
  FINISHED: "FINISHED",
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const Gender = {
  M: "M",
  F: "F",
  ANY: "ANY",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const RegistrationStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CHECKED_IN",
  CANCELLED: "CANCELLED",
} as const;
export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const CheckpointType = {
  START: "START",
  SPLIT: "SPLIT",
  FINISH: "FINISH",
} as const;
export type CheckpointType = (typeof CheckpointType)[keyof typeof CheckpointType];

export const ResultStatus = {
  FINISHED: "FINISHED",
  DNF: "DNF",
  DNS: "DNS",
  DSQ: "DSQ",
} as const;
export type ResultStatus = (typeof ResultStatus)[keyof typeof ResultStatus];

export const AppealStatus = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
  REJECTED: "REJECTED",
} as const;
export type AppealStatus = (typeof AppealStatus)[keyof typeof AppealStatus];

export const ResultSource = {
  MANUAL: "MANUAL",
  IMPORTED: "IMPORTED",
  MATCHED: "MATCHED",
  TIMING: "TIMING",
} as const;
export type ResultSource = (typeof ResultSource)[keyof typeof ResultSource];
