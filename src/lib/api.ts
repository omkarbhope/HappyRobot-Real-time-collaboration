import type { ApiResponse } from "@/shared/types/api";

const BASE = "";

async function request<T>(
  path: string,
  options: RequestInit & { parseJson?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { parseJson = true, ...init } = options;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.method !== "GET" && init.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });
  if (!res.ok && res.status === 401) {
    return { error: "Unauthorized", code: "UNAUTHORIZED" };
  }
  const raw = await res.text();
  if (!parseJson) return { error: raw || "Request failed", code: "UNKNOWN" };
  let json: ApiResponse<T>;
  try {
    json = JSON.parse(raw) as ApiResponse<T>;
  } catch {
    return { error: raw || "Invalid response", code: "UNKNOWN" };
  }
  if (!res.ok) {
    return "error" in json ? json : { error: raw, code: "UNKNOWN" };
  }
  return json;
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path, { method: "GET" });
}

export async function apiPost<T>(
  path: string,
  body: unknown
): Promise<ApiResponse<T>> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(
  path: string,
  body: unknown
): Promise<ApiResponse<T>> {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path, { method: "DELETE" });
}
