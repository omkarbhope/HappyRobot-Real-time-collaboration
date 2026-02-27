import { describe, it, expect, vi, beforeEach } from "vitest";
import { subscribe, unsubscribe, publish, getSubscriberCount } from "@/core/realtime/pubsub";

describe("PubSub", () => {
  const boardId = "board-1";
  const mockWs = {
    send: vi.fn(),
    readyState: 1,
  };

  beforeEach(() => {
    mockWs.send.mockClear();
    unsubscribe(boardId, mockWs);
  });

  it("subscribes and receives published message", () => {
    subscribe(boardId, mockWs);
    publish(boardId, { type: "task.updated", taskId: "t1" });
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: "task.updated", taskId: "t1" }));
  });

  it("does not send after unsubscribe", () => {
    subscribe(boardId, mockWs);
    unsubscribe(boardId, mockWs);
    publish(boardId, { type: "test" });
    expect(mockWs.send).not.toHaveBeenCalled();
  });

  it("returns subscriber count", () => {
    expect(getSubscriberCount(boardId)).toBe(0);
    subscribe(boardId, mockWs);
    expect(getSubscriberCount(boardId)).toBe(1);
    const mockWs2 = { send: vi.fn(), readyState: 1 };
    subscribe(boardId, mockWs2);
    expect(getSubscriberCount(boardId)).toBe(2);
    unsubscribe(boardId, mockWs);
    expect(getSubscriberCount(boardId)).toBe(1);
  });
});
