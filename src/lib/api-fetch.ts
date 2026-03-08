/**
 * Lightweight wrapper around `fetch` for internal API calls.
 *
 * Handles the repetitive pattern:
 *   1. Send request
 *   2. Parse JSON
 *   3. Throw if `!res.ok` or `!data.success`
 *
 * Callers get back the parsed JSON or a thrown `ApiError` they can catch.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Fetch a JSON API endpoint and return the parsed body.
 * Throws `ApiError` if the response is not ok or `data.success` is false.
 */
export async function apiFetch<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();

  if (!res.ok || data.success === false) {
    throw new ApiError(
      data.message || "操作失败",
      res.status
    );
  }

  return data as T;
}

/**
 * Shorthand for JSON POST/PUT/PATCH/DELETE with body serialization.
 */
export function apiMutate<T = Record<string, unknown>>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  return apiFetch<T>(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
