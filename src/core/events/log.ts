import type { TransactionClient } from "@/core/events/types";
import { db } from "@/core/db/client";

/** Derive a numeric advisory lock key from boardId so concurrent appends for the same board serialize. */
function boardLockKey(boardId: string): number {
  let h = 0;
  for (let i = 0; i < boardId.length; i++) {
    h = Math.imul(31, h) + boardId.charCodeAt(i);
    h = h | 0;
  }
  return Math.abs(h);
}

/**
 * Get the next sequence number for a board. Call inside a transaction.
 * Must be called after acquiring the board advisory lock to avoid unique constraint races.
 */
export async function getNextSeq(
  boardId: string,
  tx: TransactionClient
): Promise<bigint> {
  const last = await tx.boardEvent.findFirst({
    where: { boardId },
    orderBy: { seq: "desc" },
    select: { seq: true },
  });
  return last ? last.seq + BigInt(1) : BigInt(1);
}

/**
 * Append an event to the board_events table. Must be called inside an existing transaction.
 * Uses an advisory lock per board so concurrent requests get unique seq values.
 */
export async function appendEvent(
  tx: TransactionClient,
  input: {
    boardId: string;
    type: string;
    payload: Record<string, unknown>;
    userId: string;
  }
): Promise<{ id: string; seq: number }> {
  const key = boardLockKey(input.boardId);
  const prismaTx = tx as unknown as { $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> };
  await prismaTx.$executeRawUnsafe("SELECT pg_advisory_xact_lock($1::bigint)", key);
  const seq = await getNextSeq(input.boardId, tx);
  const created = await tx.boardEvent.create({
    data: {
      boardId: input.boardId,
      seq,
      type: input.type,
      payload: input.payload as object,
      userId: input.userId,
    },
    select: { id: true, seq: true },
  });
  return { id: created.id, seq: Number(created.seq) };
}

/**
 * Get events for a board after a given sequence (for replay / sync).
 */
export async function getEvents(
  boardId: string,
  options: { afterSeq?: number; limit?: number } = {}
) {
  const { afterSeq = 0, limit = 100 } = options;
  return db.boardEvent.findMany({
    where: { boardId, seq: { gt: afterSeq } },
    orderBy: { seq: "asc" },
    take: limit,
    include: { user: { select: { id: true, name: true, image: true } } },
  });
}

/**
 * Get a single event by id (for undo).
 */
export async function getEventById(eventId: string) {
  return db.boardEvent.findUnique({
    where: { id: eventId },
    include: { user: { select: { id: true, name: true } } },
  });
}
