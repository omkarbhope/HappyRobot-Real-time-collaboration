# Load tests (k6)

API load tests for HappyRobot. Uses [k6](https://k6.io/).

## Install k6

- macOS: `brew install k6`
- Or download from https://k6.io/docs/get-started/installation/

## Run locally

Target a running app (e.g. `npm run dev` on port 3000):

```bash
# GET /api/projects (unauthenticated will get 401; script still counts as pass for 200 or 401)
k6 run -e BASE_URL=http://localhost:3000 tests/load/projects.js

# GET /api/tasks?projectId=<uuid> (set PROJECT_ID if needed)
k6 run -e BASE_URL=http://localhost:3000 -e PROJECT_ID=your-project-uuid tests/load/tasks.js
```

## Authenticated load (optional)

To hit protected routes with 200s, pass a session cookie after signing in once (e.g. from browser dev tools):

```bash
k6 run -e BASE_URL=http://localhost:3000 -e SESSION_COOKIE="next-auth.session-token=YOUR_TOKEN" tests/load/projects.js
```

## CI / staging

```bash
k6 run -e BASE_URL=https://staging.example.com tests/load/projects.js
k6 run -e BASE_URL=https://staging.example.com -e PROJECT_ID=... -e SESSION_COOKIE="..." tests/load/tasks.js
```

## Metrics

k6 prints RPS, latency (avg, p95, p99), and error rate. Thresholds in the scripts: <5% failed requests, p95 < 2s.
