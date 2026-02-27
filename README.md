# HappyRobot

A collaborative whiteboard app: real-time canvas (sticky notes, shapes, frames, freehand), comments, presence, undo/redo, and project sharing via invite codes.

---

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** (for the app database)
- **npm** (or yarn/pnpm)

---

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/omkarbhope/HappyRobot-Real-time-collaboration.git
   cd HappyRobot
   npm install
   ```

2. **Environment variables**

   Create a `.env` (and optionally `.env.local`) in the project root with:

   | Variable | Description |
   |----------|--------------|
   | `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/happyrobot`) |
   | `NEXTAUTH_SECRET` | Secret for NextAuth session signing (e.g. `openssl rand -base64 32`) |
   | `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID (for “Sign in with Google”) |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
   | `PORT` | Optional; server port (default `3000`) |

3. **Database migration**

   Create/update the database schema:

   ```bash
   npm run db:migrate
   ```

   This runs Prisma migrations. On first use it will create the database if needed (depending on your PostgreSQL setup).

   Optional:

   - **Seed data:** `npm run db:seed`
   - **Prisma Studio:** `npm run db:studio` (browse and edit data)

---

## Running the app

Use the **custom server** so the app and WebSockets run together (needed for real-time board updates, presence, cursors):

```bash
npm run server
```

This starts the HTTP server and the WebSocket endpoint at `/ws?boardId=<id>`. Open [http://localhost:3000](http://localhost:3000) in the browser.

- **Development:** Next.js runs in dev mode with hot reload.
- **Production:** Run `npm run build` first, then `npm run server`.

Alternative (Next.js only, no WebSockets):

```bash
npm run dev
```

Use this for quick UI work; real-time features will not work.

---

## Docker

Build and run the app and PostgreSQL with Docker Compose:

1. **Create a `.env`** in the project root with at least:
   - `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`)
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (for Sign in with Google)
   - Optionally `NEXTAUTH_URL` (defaults to `http://localhost:3000`)

2. **Start:**

   ```bash
   docker compose up -d
   ```

   The app runs at [http://localhost:3000](http://localhost:3000). The database is created automatically; migrations run on startup (`prisma migrate deploy`).

3. **Optional:** Seed the DB (run inside the app container):

   ```bash
   docker compose exec app npx prisma db seed
   ```

To build the image only (e.g. for a different database): `docker build -t happyrobot .`. Set `DATABASE_URL` when running the container.

---

## Tests

| Command | Description |
|---------|-------------|
| `npm run test` | Vitest in watch mode (unit + integration) |
| `npm run test:run` | Single run, no watch |
| `npm run test:coverage` | Coverage report |
| `npm run test:e2e` | Playwright E2E (requires `npm run test:e2e:install` once) |

Unit and integration tests use mocks for auth and DB; no database is required. E2E tests run against a real browser.

---

## Architecture and design

### High-level

- **Backend:** REST API (Next.js App Router under `src/app/api/`) + custom Node server that serves the app and a WebSocket at `/ws`. All protected routes use session auth and rate limiting, then call feature services. Writes go through Prisma; board changes are appended to an event log and published to WebSocket subscribers.
- **Frontend:** Next.js 16 (App Router), React 19, a single Zustand store for the active board, and React Flow for the canvas. Realtime is handled by a WebSocket hook that updates the same store.

### Main folders

| Path | Role |
|------|------|
| `src/app/` | Pages and API routes (Next.js App Router) |
| `src/features/` | Feature modules: board (store, tools, UI), canvas, tasks, comments, undo, invite, notifications, presence, realtime, etc. |
| `src/core/` | Shared backend: auth, DB client, event log, realtime pub/sub, cache, rate limiting |
| `src/lib/` | Shared client/server helpers (API client, debounced PATCH, utils) |
| `src/components/` | Reusable UI (e.g. shadcn) |
| `src/shared/` | Constants, types, Zod schemas used by API and features |
| `prisma/` | Schema and migrations |

### Design notes

- **API:** Routes only validate input and call feature services; business logic lives in `src/features/<name>/service.ts`.
- **Realtime:** After a write, the service invalidates the board cache and publishes an event; all clients subscribed to that board receive the same payload.
- **Event log:** Board events are stored with a per-board sequence and advisory lock; used for sync and undo/redo.
- **Single board store:** One Zustand store holds project, nodes, edges, tools, layers, presence, comments, and undo state so the canvas and panels stay in sync.

### Documentation

- **Main documentation (requirements & coverage):** [docs/HappyRobot_Requirements_Coverage.docx](docs/HappyRobot_Requirements_Coverage.docx) — primary reference for product requirements and coverage.
- **Backend:** [docs/backend-architecture.md](docs/backend-architecture.md)
- **Frontend:** [docs/frontend-architecture.md](docs/frontend-architecture.md)
