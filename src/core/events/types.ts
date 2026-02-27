import type { BoardEventType } from "@/shared/constants/events";
import type { Prisma } from "@prisma/client";

export type { BoardEventType };

export type BoardEventPayload = Record<string, unknown>;

export interface AppendEventInput {
  boardId: string;
  type: BoardEventType;
  payload: BoardEventPayload;
  userId: string;
}

/** Transaction type: Prisma's interactive transaction client (subset of PrismaClient). */
export type TransactionClient = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use"
>;
