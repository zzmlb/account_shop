/**
 * In-memory sliding window rate limiter.
 *
 * Uses a Map to track request timestamps per key. Each call to the returned
 * limiter function records the current timestamp and evicts entries that fall
 * outside the sliding window, so the count always reflects the *recent* request
 * rate rather than a fixed bucket.
 *
 * A periodic cleanup timer removes keys whose entire window has expired,
 * preventing unbounded memory growth from one-off visitors.
 */

interface RateLimitResult {
  /** Whether the request is allowed. */
  success: boolean;
  /** How many requests remain in the current window. */
  remaining: number;
  /** Unix-epoch millisecond timestamp when the window resets for this key. */
  reset: number;
}

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  max: number;
  /** Window size in seconds. */
  windowSeconds: number;
}

/**
 * Create a rate limiter that uses a sliding window backed by an in-memory Map.
 *
 * @returns A function `(key: string) => RateLimitResult` that should be called
 *          once per incoming request.
 */
export function rateLimit({ max, windowSeconds }: RateLimitOptions) {
  const windowMs = windowSeconds * 1000;

  /**
   * Each key maps to a sorted array of request timestamps (ms) that fall
   * within the current sliding window.
   */
  const store = new Map<string, number[]>();

  // --- Automatic cleanup of expired entries -----------------------------------
  // Runs every `windowSeconds` (at least every 60 s) to drop keys whose most
  // recent timestamp is older than the window.  The timer is unref'd so it does
  // not keep a Node.js process alive.
  const cleanupIntervalMs = Math.max(windowSeconds, 60) * 1000;

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store) {
      // Keep only timestamps inside the window.
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, valid);
      }
    }
  }, cleanupIntervalMs);

  // Allow the Node.js process to exit even if the timer is still scheduled.
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }

  // --- Limiter function -------------------------------------------------------
  function limiter(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Retrieve existing timestamps and evict those outside the window.
    let timestamps = store.get(key) ?? [];
    timestamps = timestamps.filter((t) => t > windowStart);

    // The window resets at (earliest surviving timestamp + windowMs), or if
    // there are no prior requests, at (now + windowMs).
    const reset =
      timestamps.length > 0
        ? timestamps[0] + windowMs
        : now + windowMs;

    if (timestamps.length >= max) {
      // Limit exceeded – do NOT record this request.
      store.set(key, timestamps);
      return {
        success: false,
        remaining: 0,
        reset,
      };
    }

    // Record the current request.
    timestamps.push(now);
    store.set(key, timestamps);

    return {
      success: true,
      remaining: max - timestamps.length,
      reset,
    };
  }

  return limiter;
}

// ---------------------------------------------------------------------------
// Preset limiters
// ---------------------------------------------------------------------------

/** Login endpoint: 5 requests per 60 seconds. */
export const loginLimiter = rateLimit({ max: 5, windowSeconds: 60 });

/** General API endpoints: 30 requests per 60 seconds. */
export const apiLimiter = rateLimit({ max: 30, windowSeconds: 60 });

/** Registration endpoint: 3 requests per 300 seconds (5 minutes). */
export const registerLimiter = rateLimit({ max: 3, windowSeconds: 300 });

/** File upload endpoint: 10 uploads per 60 seconds. */
export const uploadLimiter = rateLimit({ max: 10, windowSeconds: 60 });

/** Payment endpoint: 5 requests per 60 seconds. */
export const paymentLimiter = rateLimit({ max: 5, windowSeconds: 60 });

/** Contact form / email sending: 3 requests per 300 seconds (5 minutes). */
export const contactLimiter = rateLimit({ max: 3, windowSeconds: 300 });

/** Order creation: 10 orders per 60 seconds. */
export const orderLimiter = rateLimit({ max: 10, windowSeconds: 60 });

/**
 * Extract client IP from a Next.js request.
 */
export function getClientIp(request: { headers: { get(name: string): string | null } }): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Build a standard 429 JSON response with Retry-After header.
 */
export function rateLimitResponse(result: RateLimitResult) {
  const retryAfterSec = Math.ceil((result.reset - Date.now()) / 1000);
  return Response.json(
    { success: false, message: "请求过于频繁，请稍后再试" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(retryAfterSec, 1)),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.reset),
      },
    }
  );
}
