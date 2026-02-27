/**
 * k6 load script: GET /api/projects
 * Run: k6 run tests/load/projects.js
 * With base URL: k6 run -e BASE_URL=http://localhost:3000 tests/load/projects.js
 * With auth cookie (for authenticated load): k6 run -e BASE_URL=http://localhost:3000 -e SESSION_COOKIE="next-auth.session-token=YOUR_TOKEN" tests/load/projects.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SESSION_COOKIE = __ENV.SESSION_COOKIE || "";

export const options = {
  stages: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

export default function () {
  const headers = {};
  if (SESSION_COOKIE) {
    headers.Cookie = SESSION_COOKIE;
  }
  const res = http.get(`${BASE_URL}/api/projects`, { headers });
  check(res, {
    "status is 200 or 401": (r) => r.status === 200 || r.status === 401,
  });
  sleep(0.5);
}
