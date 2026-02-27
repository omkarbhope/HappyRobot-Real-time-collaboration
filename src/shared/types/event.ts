import type { BoardEventType } from "@/shared/constants/events";

export interface BoardEventDto {
  id: string;
  boardId: string;
  seq: number;
  type: BoardEventType;
  payload: Record<string, unknown>;
  userId: string;
  createdAt: Date;
}
