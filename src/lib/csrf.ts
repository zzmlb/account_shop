/**
 * CSRF protection via Origin header verification.
 *
 * For same-origin requests, browsers always send the Origin header on
 * state-changing requests (POST, PUT, PATCH, DELETE). We validate that the
 * Origin matches the expected host to prevent cross-site request forgery.
 *
 * This approach is recommended by OWASP as a primary defense and works well
 * with cookie-based authentication.
 */

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Verify that a mutation request originates from the same site.
 * Returns null if the request is safe, or an error message if CSRF check fails.
 */
export function verifyCsrf(request: {
  method: string;
  headers: { get(name: string): string | null };
  url: string;
}): string | null {
  // Only check mutation methods
  if (!MUTATION_METHODS.has(request.method)) {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // At least one of Origin or Referer must be present
  if (!origin && !referer) {
    // Allow requests without Origin/Referer (e.g., server-to-server, curl)
    // This is a trade-off: strict mode would reject these
    return null;
  }

  // Parse the request URL to get the expected host
  let requestHost: string;
  try {
    requestHost = new URL(request.url).host;
  } catch {
    return "Invalid request URL";
  }

  // Check Origin header first (most reliable)
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== requestHost) {
        return `CSRF: Origin mismatch (${originHost} != ${requestHost})`;
      }
      return null; // Origin matches
    } catch {
      return "CSRF: Invalid Origin header";
    }
  }

  // Fallback to Referer header
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== requestHost) {
        return `CSRF: Referer mismatch (${refererHost} != ${requestHost})`;
      }
      return null; // Referer matches
    } catch {
      return "CSRF: Invalid Referer header";
    }
  }

  return null;
}
