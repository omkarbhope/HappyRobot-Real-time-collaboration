/**
 * k6 load script: GET /api/tasks?projectId=<id>
 * Run: k6 run tests/load/tasks.js
 * With base URL and project: k6 run -e BASE_URL=http://localhost:3000 -e PROJECT_ID=your-project-uuid tests/load/tasks.js
 * With auth: k6 run -e BASE_URL=http://localhost:3000 -e PROJECT_ID=... -e SESSION_COOKIE="next-auth.session-token=..." tests/load/tasks.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const PROJECT_ID = __ENV.PROJECT_ID || "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee";
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
  const res = http.get(`${BASE_URL}/api/tasks?projectId=${PROJECT_ID}`, { headers });
  check(res, {
    "status is 200 or 401": (r) => r.status === 200 || r.status === 401,
  });
  sleep(0.5);
}
