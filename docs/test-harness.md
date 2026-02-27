# HappyRobot — Test Harness Documentation

This document describes the testing setup, structure, and how to run or extend tests.

---

## 1. Overview

HappyRobot uses a layered test strategy:

| Layer | Tool | Location | Purpose |
|-------|------|----------|---------|
| **Unit** | Vitest | `tests/unit/` | Core modules and feature services in isolation (mocked DB, events, realtime). |
| **Integration** | Vitest | `tests/integration/` | API route handlers with mocked auth and services; no real DB. |
| **E2E** | Playwright | `tests/e2e/` | Full browser flows (smoke: home, API health). |
| **Load** | k6 | `tests/load/` | HTTP load against `/api/projects` and `/api/tasks`. |

**Stack:** Vitest (Node), Playwright (Chromium by default), k6 (separate binary). No database or external services are required for unit or integration tests; everything is mocked.

---

## 2. Directory Structure

```
tests/
├── setup.ts                 # Vitest setup: loads .env.test, .env.local, .env
├── README.md                # Short reference (commands, where tests live)
├── unit/                    # Unit tests (Vitest)
│   ├── cache.test.ts
│   ├── projects.service.test.ts
│   ├── rate-limit.api.test.ts
│   ├── rate-limit.ws.test.ts
│   ├── realtime.pubsub.test.ts
│   ├── tasks.service.test.ts
│   └── undo.service.test.ts
├── integration/             # API route tests (Vitest)
│   ├── api.auth.test.ts
│   ├── api.comments.test.ts
│   ├── api.events.test.ts
│   ├── api.events.redo.test.ts
│   ├── api.invite.test.ts
│   ├── api.projects.test.ts
│   ├── api.projects.id.test.ts
│   ├── api.tasks.test.ts
│   ├── api.tasks.id.test.ts
│   └── api.undo.test.ts
├── e2e/                     # Playwright browser tests
│   └── smoke.spec.ts
└── load/                    # k6 load scripts
    ├── README.md
    ├── projects.js
    └── tasks.js
```

---

## 3. Vitest (Unit + Integration)

### 3.1 Configuration

**File:** `vitest.config.ts` (project root)

- **Environment:** `node`
- **Globals:** `true` (no need to import `describe`/`it`/`expect`/`vi`)
- **Setup:** `./tests/setup.ts` runs before tests (loads env files)
- **Include:** `tests/unit/**/*.test.ts`, `tests/integration/**/*.test.ts`
- **Coverage:** v8; reports: text, json, lcov  
  - **Include:** `src/core/**`, `src/features/**`, `src/shared/**`  
  - **Exclude:** `*.test.ts`, `*.spec.ts`, `index.ts`, `types.ts`
- **Timeouts:** `testTimeout: 10_000`, `hookTimeout: 10_000` (ms)
- **Alias:** `@` → `./src` (same as app)

### 3.2 Setup and environment

**File:** `tests/setup.ts`

Loads environment variables in order:

1. `.env.test`
2. `.env.local`
3. `.env` (default)

Use `.env.test` for test-only values (e.g. a test database URL if you add real DB tests later). Current tests do not require a real database.

### 3.3 Commands

| Command | Description |
|--------|-------------|
| `npm run test` | Vitest in watch mode (re-runs on file changes). |
| `npm run test:run` | Single run, exit with code 0/1. Use in CI. |
| `npm run test:coverage` | Single run with coverage report (text + json + lcov). |

---

## 4. Unit Tests

Unit tests live in `tests/unit/`. They exercise core modules and feature services with **mocked** dependencies (no real DB, no real HTTP, no real WebSocket).

### 4.1 What is tested

- **Core:** `boardCache` (get/set/invalidate/TTL), rate limit (API + WS), realtime pub/sub.
- **Services:** Projects, tasks, undo — with mocked `db`, `appendEvent`, `publish`, `boardCache`.

### 4.2 Patterns

- **No route imports:** Unit tests import from `@/core/*` or `@/features/*/service`, not from `@/app/api/*`.
- **Mock at top level:** Use `vi.mock("@/core/db/client", () => ({ ... }))` so the module is replaced before the test runs. Define mock data **inside** the factory (or in a variable used only inside the factory) to avoid hoisting issues.
- **Transactions:** For services that use `db.$transaction(fn)`, mock `$transaction` to call `fn(mockTx)` and provide a `mockTx` with `task.*`, `projectMember.*`, etc.
- **Reset between tests:** Use `beforeEach(() => vi.clearAllMocks())` (and re-apply any default mock implementations) so one test does not affect another.
- **Fake timers:** Use `vi.useFakeTimers()` / `vi.advanceTimersByTime()` / `vi.useRealTimers()` for TTL or time-based behavior.

### 4.3 Example (core module)

```ts
// tests/unit/cache.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { boardCache } from "@/core/cache";

describe("Board cache", () => {
  beforeEach(() => {
    boardCache.invalidate("board-1");
  });

  it("returns null when key is missing", () => {
    expect(boardCache.get("board-1")).toBeNull();
  });

  it("returns null after TTL expires", () => {
    vi.useFakeTimers();
    boardCache.set("board-1", { x: 1 }, 1000);
    vi.advanceTimersByTime(1001);
    expect(boardCache.get("board-1")).toBeNull();
    vi.useRealTimers();
  });
});
```

### 4.4 Example (feature service with mocks)

Services typically need:

- `vi.mock("@/core/db/client")` — expose `db.task`, `db.projectMember`, `db.$transaction`, etc.
- `vi.mock("@/core/events")` — `appendEvent`
- `vi.mock("@/core/realtime")` — `publish`
- `vi.mock("@/core/cache")` — `boardCache.invalidate`

In `beforeEach`, set `mockTx` (or `db`) return values so each test gets a known state. Assert both the return value of the service and that the right mocks were called (e.g. `expect(appendEvent).toHaveBeenCalledWith(...)`).

---

## 5. Integration Tests (API Routes)

Integration tests live in `tests/integration/`. They import **route handlers** from `@/app/api/*/route` and call them with `Request` objects. Auth and feature services are **mocked**; no real database or NextAuth.

### 5.1 What is tested

- **Auth:** `api.auth.test.ts` — GET `/api/projects` returns 401 when `requireUserId` is mocked to reject.
- **Projects:** GET list, POST create; GET/PATCH/DELETE by id. Status codes, response body shape, validation (400), forbidden (403), not found (404).
- **Tasks:** GET list, POST create; GET/PATCH/DELETE by id. Same status/body/validation patterns.
- **Events:** GET (boardId required); POST undo/redo (eventId, validation).
- **Comments:** GET by taskId, POST create; 401, 404.
- **Invite:** POST create, POST join; 400, 403, 404.

### 5.2 Patterns

- **Mock auth and rate limit first:** Every integration test file mocks `@/core/auth` (`requireUserId`) and `@/core/rate-limit/api-limiter` (`checkApiRateLimit`, `getApiRateLimitRetryAfter`) so the route runs without real auth or rate limiting.
- **Mock the feature service:** Mock `@/features/<feature>/service` and provide `vi.fn().mockResolvedValue(...)` or `mockRejectedValueOnce(...)` for the handler’s calls. Put mock data **inside** the `vi.mock` factory to avoid "Cannot access before initialization" (Vitest hoists mocks).
- **Build a real Request:** Use `new Request(url, { method, headers, body })` with a valid `url` and `Content-Type: application/json` for POST/PATCH.
- **Assert status and body:** `expect(res.status).toBe(200)`, `const body = await res.json()`, `expect(body.data).toBeDefined()`, `expect(body.code).toBe("UNAUTHORIZED")`, etc.
- **401:** In a test that expects 401, do `vi.mocked(requireUserId).mockRejectedValueOnce(new Error("UNAUTHORIZED"))` (and optionally re-import the route so it uses the updated mock).

### 5.3 Example

```ts
// tests/integration/api.projects.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/projects/route";

vi.mock("@/core/auth", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

vi.mock("@/core/rate-limit/api-limiter", () => ({
  checkApiRateLimit: vi.fn().mockReturnValue(true),
  getApiRateLimitRetryAfter: vi.fn().mockReturnValue(0),
}));

vi.mock("@/features/projects/service", () => {
  const mockProject = { id: "p1", name: "Project 1", ... };
  return {
    listByUser: vi.fn().mockResolvedValue([mockProject]),
    create: vi.fn().mockResolvedValue(mockProject),
  };
});

describe("API GET /api/projects", () => {
  it("returns 200 and list when authenticated", async () => {
    const req = new Request("http://localhost:3000/api/projects");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("returns 401 when not authenticated", async () => {
    const { requireUserId } = await import("@/core/auth");
    vi.mocked(requireUserId).mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    const res = await GET(new Request("http://localhost:3000/api/projects"));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("UNAUTHORIZED");
  });
});
```

---

## 6. Playwright (E2E)

E2E tests run in a real browser (default: Chromium only) and hit the running app.

### 6.1 Configuration

**File:** `playwright.config.ts`

- **Test directory:** `./tests/e2e`
- **Base URL:** `process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000"`
- **Projects:** One project: Chromium (Desktop Chrome). Add Firefox/WebKit in `projects` and run `npx playwright install` to run on all three.
- **Web server:** When not in CI, Playwright can start the app with `npm run dev` and wait for `http://localhost:3000` (timeout 120s). If `PLAYWRIGHT_TEST_BASE_URL` is set, the web server config is not used (use an already-running server).
- **CI:** `forbidOnly: true`, `retries: 2`, `workers: 1`. No automatic web server in CI (start the app in the pipeline).
- **Reporter:** `html`
- **Trace:** `on-first-retry`

### 6.2 Commands

| Command | Description |
|--------|-------------|
| `npm run test:e2e` | Run Playwright tests. Starts dev server if needed (unless `PLAYWRIGHT_TEST_BASE_URL` is set). |
| `npm run test:e2e:ui` | Playwright UI mode (interactive). |
| `npm run test:e2e:install` | Install Chromium only (`npx playwright install chromium`). Run once (or after Node/Playwright upgrade). |

**Use an existing server:**

```bash
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 npx playwright test
```

### 6.3 Current E2E tests

**File:** `tests/e2e/smoke.spec.ts`

- **Home page loads:** `page.goto("/")`, then assert title matches `/Next.js|Create Next App|happyrobot/i`.
- **API health:** `request.get("/api/auth/providers")`, then `expect(res.ok()).toBe(true)`.

### 6.4 Writing new E2E tests

- Use `test` and `expect` from `@playwright/test`.
- Use `page` for browser actions (`goto`, `click`, `fill`), `request` for API calls in the same origin.
- Prefer stable selectors (e.g. `getByRole`, `getByLabelText`). Avoid fragile class or DOM structure.
- If tests need auth, sign in once in a `beforeEach` or use a storage state file.

---

## 7. Load Tests (k6)

k6 is a separate binary; it is not run via npm. Scripts live in `tests/load/`.

### 7.1 Scripts

| Script | Endpoint | Purpose |
|--------|----------|---------|
| `tests/load/projects.js` | `GET /api/projects` | List projects (401 if no auth). |
| `tests/load/tasks.js` | `GET /api/tasks?projectId=<id>` | List tasks for a project. |

### 7.2 Environment variables

- **BASE_URL** (default: `http://localhost:3000`) — App base URL.
- **PROJECT_ID** (tasks only, default: placeholder UUID) — Project for task list.
- **SESSION_COOKIE** (optional) — e.g. `next-auth.session-token=...` for authenticated load.

### 7.3 Running load tests

**Prerequisites:** Install k6 (e.g. `brew install k6` on macOS).

**Local (app running on port 3000):**

```bash
# Unauthenticated (projects may return 401; script still passes)
k6 run -e BASE_URL=http://localhost:3000 tests/load/projects.js

# Tasks (use a real project ID for 200s)
k6 run -e BASE_URL=http://localhost:3000 -e PROJECT_ID=your-project-uuid tests/load/tasks.js
```

**With auth:** Copy session cookie from browser after signing in, then:

```bash
k6 run -e BASE_URL=http://localhost:3000 -e SESSION_COOKIE="next-auth.session-token=YOUR_TOKEN" tests/load/projects.js
```

**Staging/CI:** Set `BASE_URL` (and optionally `PROJECT_ID`, `SESSION_COOKIE`) to the target environment.

### 7.4 Load profile and thresholds

- **Stages:** Ramp to 5 VUs over 30s, hold 10 VUs for 1m, ramp down to 0 over 30s.
- **Thresholds:** `http_req_failed` rate &lt; 5%, `http_req_duration` p(95) &lt; 2000 ms.
- k6 prints RPS, latency (avg, p95, p99), and error rate after the run.

---

## 8. Adding New Tests

### 8.1 New unit test

1. Create `tests/unit/<module>.test.ts`.
2. Import the module under test from `@/core/*` or `@/features/*/service`.
3. Add `vi.mock("@/core/...")` (and optionally `@/features/...`) with the right shape. Put mock data inside the factory.
4. Use `describe` / `it` / `expect` / `beforeEach`. Run with `npm run test` or `npm run test:run`.

### 8.2 New API integration test

1. Create `tests/integration/api.<feature>.test.ts` (or add to an existing file).
2. Mock `@/core/auth` and `@/core/rate-limit/api-limiter` in every file.
3. Mock `@/features/<feature>/service` with the handler’s expected calls.
4. Import the route handler (e.g. `GET`, `POST`) from `@/app/api/<path>/route`.
5. Build a `Request` and call the handler; assert `res.status` and `await res.json()`.

### 8.3 New E2E test

1. Add or create `tests/e2e/<flow>.spec.ts`.
2. Use `test`, `expect`, `page`, `request` from `@playwright/test`.
3. Run with `npm run test:e2e` (ensure dev server or `PLAYWRIGHT_TEST_BASE_URL` is set).

### 8.4 New load script

1. Add `tests/load/<name>.js` (or reuse an existing script with a new scenario).
2. Use `__ENV.BASE_URL`, optional `SESSION_COOKIE` / `PROJECT_ID`.
3. Define `options.stages` and `options.thresholds`.
4. Run with `k6 run -e BASE_URL=... tests/load/<name>.js`.

---

## 9. CI and environment summary

- **Vitest:** Run `npm run test:run` (and optionally `npm run test:coverage`). No DB or env vars required for current tests.
- **Playwright:** In CI, start the app (e.g. `npm run build && npm run start` or `npm run dev`), set `PLAYWRIGHT_TEST_BASE_URL` if needed, then run `npm run test:e2e`. Install browsers in the pipeline (`npx playwright install chromium`).
- **k6:** Optional; run against a deployed or staging URL with `BASE_URL` and optional auth.

---

## 10. Quick reference

| Goal | Command |
|------|--------|
| Run all Vitest tests (watch) | `npm run test` |
| Run Vitest once (CI) | `npm run test:run` |
| Vitest with coverage | `npm run test:coverage` |
| Run E2E (starts dev if needed) | `npm run test:e2e` |
| E2E with existing server | `PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 npx playwright test` |
| Install Playwright browsers | `npm run test:e2e:install` or `npx playwright install chromium` |
| Load test projects | `k6 run -e BASE_URL=http://localhost:3000 tests/load/projects.js` |
| Load test tasks | `k6 run -e BASE_URL=http://localhost:3000 -e PROJECT_ID=<uuid> tests/load/tasks.js` |
