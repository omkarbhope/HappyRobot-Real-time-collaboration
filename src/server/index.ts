import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import http from "http";
import next from "next";
import { WebSocketServer, type WebSocket } from "ws";
import { parse } from "url";
import { db } from "@/core/db/client";
import { subscribe, unsubscribe, publish } from "@/core/realtime";
import { checkWsRateLimit, clearWsRateLimit } from "@/core/rate-limit";
import { nanoid } from "nanoid";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

async function getUserIdFromRequest(req: http.IncomingMessage): Promise<string | null> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const sessionToken = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("next-auth.session-token=") || s.startsWith("__Secure-next-auth.session-token="))
    ?.split("=")[1]
    ?.trim();
  if (!sessionToken) return null;
  const session = await db.session.findUnique({
    where: { sessionToken },
    include: { user: { select: { id: true } } },
  });
  if (!session || session.expires < new Date()) return null;
  return session.user.id;
}

async function isProjectMember(projectId: string, userId: string): Promise<boolean> {
  const m = await db.projectMember.findFirst({
    where: { projectId, userId },
  });
  return !!m;
}

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const url = parse(req.url!, true);
    handle(req, res, url);
  });

  const wss = new WebSocketServer({ noServer: true });

  // Standard pattern: handle upgrade only for our path (/ws). Do not touch other upgrades
  // (e.g. /_next/webpack-hmr) so Next.js can handle HMR. Next attaches its upgrade handler
  // to this server on first HTTP request (getRequestHandler → setupWebSocketHandler).
  server.on("upgrade", (request, socket, head) => {
    const url = parse(request.url!, true);
    const pathname = url.pathname ?? "";
    if (pathname === "/ws") {
      const boardId = (url.query?.boardId as string) ?? "";
      if (!boardId) {
        socket.destroy();
        return;
      }
      getUserIdFromRequest(request).then(async (userId) => {
        if (!userId) {
          socket.destroy();
          return;
        }
        const allowed = await isProjectMember(boardId, userId);
        if (!allowed) {
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request, { boardId, userId });
        });
      });
      return;
    }
    // Let Next.js handle other upgrades (e.g. /_next/webpack-hmr for HMR). Do not destroy
    // the socket so the next listener (Next’s) can handle it.
  });

  const connectionIdByWs = new WeakMap<WebSocket, string>();
  /** boardId -> userId -> { name, image } for presence display */
  const boardUsers = new Map<string, Map<string, { name: string | null; image: string | null }>>();
  /** boardId -> userId -> Set of connectionIds; only publish presence.leave when last connection for that user closes */
  const boardUserConnections = new Map<string, Map<string, Set<string>>>();
  const lastCursorByConnection = new Map<string, number>();
  const CURSOR_THROTTLE_MS = 50;

  function getBoardUserMap(bid: string): Map<string, { name: string | null; image: string | null }> {
    let m = boardUsers.get(bid);
    if (!m) {
      m = new Map();
      boardUsers.set(bid, m);
    }
    return m;
  }

  function getBoardConnectionSet(bid: string): Map<string, Set<string>> {
    let m = boardUserConnections.get(bid);
    if (!m) {
      m = new Map();
      boardUserConnections.set(bid, m);
    }
    return m;
  }

  function addConnection(bid: string, uid: string, connectionId: string): void {
    const connSet = getBoardConnectionSet(bid);
    let set = connSet.get(uid);
    if (!set) {
      set = new Set();
      connSet.set(uid, set);
    }
    set.add(connectionId);
  }

  function removeConnection(bid: string, uid: string, connectionId: string): boolean {
    const connSet = getBoardConnectionSet(bid);
    const set = connSet.get(uid);
    if (!set) return false;
    set.delete(connectionId);
    if (set.size === 0) {
      connSet.delete(uid);
      return true;
    }
    return false;
  }

  wss.on("connection", (ws: WebSocket, _req: http.IncomingMessage, context: { boardId: string; userId: string }) => {
    const { boardId, userId } = context;
    const connectionId = nanoid();
    connectionIdByWs.set(ws, connectionId);
    addConnection(boardId, userId, connectionId);
    subscribe(boardId, ws as unknown as { send(data: string): void; readyState: number });

    db.user
      .findUnique({
        where: { id: userId },
        select: { id: true, name: true, image: true },
      })
      .then((user) => {
        if (user) {
          const boardUserMap = getBoardUserMap(boardId);
          const isFirstConnectionForUser = (getBoardConnectionSet(boardId).get(userId)?.size ?? 0) === 1;
          boardUserMap.set(userId, { name: user.name, image: user.image });
          if (isFirstConnectionForUser) {
            publish(boardId, {
              type: "presence.join",
              userId: user.id,
              name: user.name,
              image: user.image,
            });
          }
          // Send existing users to this connection so "Who's here" is correct for the joiner
          for (const [existingUserId, info] of boardUserMap) {
            if (existingUserId === userId) continue;
            try {
              if (ws.readyState === 1) {
                ws.send(
                  JSON.stringify({
                    type: "presence.join",
                    userId: existingUserId,
                    name: info.name,
                    image: info.image,
                  })
                );
              }
            } catch {
              // ignore send errors
            }
          }
          // Include the joiner themselves so "Who's here" count includes them
          try {
            if (ws.readyState === 1) {
              ws.send(
                JSON.stringify({
                  type: "presence.join",
                  userId: user.id,
                  name: user.name,
                  image: user.image,
                })
              );
            }
          } catch {
            // ignore
          }
        }
      });

    ws.on("message", (raw: Buffer) => {
      if (!checkWsRateLimit(connectionId)) {
        try {
          ws.send(JSON.stringify({ type: "backpressure", message: "Too many messages" }));
        } catch {
          // ignore
        }
        return;
      }
      try {
        const msg = JSON.parse(raw.toString()) as { type?: string; x?: number; y?: number };
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }
        if (msg.type === "cursor" && typeof msg.x === "number" && typeof msg.y === "number") {
          const now = Date.now();
          const last = lastCursorByConnection.get(connectionId) ?? 0;
          if (now - last >= CURSOR_THROTTLE_MS) {
            lastCursorByConnection.set(connectionId, now);
            const info = getBoardUserMap(boardId).get(userId) ?? { name: null, image: null };
            publish(boardId, {
              type: "cursor",
              userId,
              name: info.name,
              image: info.image,
              x: msg.x,
              y: msg.y,
            });
          }
        }
      } catch {
        // ignore invalid JSON
      }
    });

    ws.on("close", () => {
      const wasLast = removeConnection(boardId, userId, connectionId);
      if (wasLast) {
        getBoardUserMap(boardId).delete(userId);
        publish(boardId, { type: "presence.leave", userId });
      }
      unsubscribe(boardId, ws as unknown as { send(data: string): void; readyState: number });
      clearWsRateLimit(connectionId);
      lastCursorByConnection.delete(connectionId);
    });

    ws.on("error", () => {
      const wasLast = removeConnection(boardId, userId, connectionId);
      if (wasLast) {
        getBoardUserMap(boardId).delete(userId);
        publish(boardId, { type: "presence.leave", userId });
      }
      unsubscribe(boardId, ws as unknown as { send(data: string): void; readyState: number });
      clearWsRateLimit(connectionId);
      lastCursorByConnection.delete(connectionId);
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> WebSocket on ws://localhost:${port}/ws?boardId=<id>`);
  });
});
