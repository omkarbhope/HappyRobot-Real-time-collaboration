# Testing

## Stack

- **Vitest** – Unit and API integration tests (backend). Fast, runs in Node.
- **Playwright** – E2E / UI tests. Runs in real browsers; use for full user flows when the frontend exists.

## Commands

```bash
npm run test          # Vitest watch
npm run test:run      # Vitest single run
npm run test:coverage # Vitest with coverage
npm run test:e2e      # Playwright (starts dev server if not running)
npm run test:e2e:ui   # Playwright UI mode
```

## Vitest (unit + integration)

- **Unit:** `tests/unit/` – Core modules (cache, rate-limit, realtime) and feature services (with mocked db).
- **Integration:** `tests/integration/` – API route handlers with mocked auth/rate-limit; assert status and body.

Run with: `npm run test:run`. No database required for current tests (mocks used).

## Playwright (e2e)

- **E2E:** `tests/e2e/` – Browser tests. Smoke: home page and API auth route.
- **Install browsers once:** Run `npx playwright install` (or `npx playwright install chromium` for Chromium only). Without this, e2e will fail with "Executable doesn't exist".
- By default only Chromium runs so e2e passes with `npx playwright install chromium`. To run Firefox/WebKit too, run `npx playwright install` and add those projects back in `playwright.config.ts`.
- By default, `npm run test:e2e` starts the Next.js dev server. To use an already-running server: `PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 npx playwright test`.

## Adding tests

- **New unit test:** `tests/unit/<module>.test.ts`; mock `@/core/db/client` and `@/core/events` etc. as needed.
- **New API test:** `tests/integration/api.<feature>.test.ts`; mock `@/core/auth` and `@/features/<feature>/service`.
- **New e2e:** `tests/e2e/<flow>.spec.ts`; use `page`, `request`, and `expect` from `@playwright/test`.
