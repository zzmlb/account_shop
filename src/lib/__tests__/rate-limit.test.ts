import { describe, it, expect } from "vitest";
import {
  rateLimit,
  getClientIp,
  rateLimitResponse,
  loginLimiter,
  apiLimiter,
  registerLimiter,
  uploadLimiter,
  paymentLimiter,
  contactLimiter,
  orderLimiter,
} from "../rate-limit";

describe("rateLimit", () => {
  it("allows requests within limit", () => {
    const limiter = rateLimit({ max: 3, windowSeconds: 60 });

    const r1 = limiter("test-key");
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter("test-key");
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter("test-key");
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests exceeding limit", () => {
    const limiter = rateLimit({ max: 2, windowSeconds: 60 });

    limiter("block-key");
    limiter("block-key");

    const r3 = limiter("block-key");
    expect(r3.success).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    const limiter = rateLimit({ max: 1, windowSeconds: 60 });

    const r1 = limiter("key-a");
    expect(r1.success).toBe(true);

    const r2 = limiter("key-b");
    expect(r2.success).toBe(true);

    const r3 = limiter("key-a");
    expect(r3.success).toBe(false);
  });

  it("provides reset timestamp in the future", () => {
    const limiter = rateLimit({ max: 1, windowSeconds: 60 });
    const now = Date.now();

    const result = limiter("time-key");
    expect(result.reset).toBeGreaterThan(now);
    expect(result.reset).toBeLessThanOrEqual(now + 60001);
  });
});

describe("getClientIp", () => {
  const makeRequest = (headers: Record<string, string | null>) => ({
    headers: { get: (name: string) => headers[name] ?? null },
  });

  it("extracts IP from x-forwarded-for (first entry)", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace from x-forwarded-for", () => {
    const req = makeRequest({ "x-forwarded-for": "  10.0.0.1 , 10.0.0.2" });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip", () => {
    const req = makeRequest({ "x-real-ip": "192.168.1.1" });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it("returns 'unknown' when no IP headers present", () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = makeRequest({
      "x-forwarded-for": "1.1.1.1",
      "x-real-ip": "2.2.2.2",
    });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 status", async () => {
    const result = { success: false, remaining: 0, reset: Date.now() + 30000 };
    const response = rateLimitResponse(result);
    expect(response.status).toBe(429);
  });

  it("includes Retry-After header", async () => {
    const reset = Date.now() + 30000;
    const result = { success: false, remaining: 0, reset };
    const response = rateLimitResponse(result);
    const retryAfter = Number(response.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(31);
  });

  it("includes rate limit headers", async () => {
    const result = { success: false, remaining: 0, reset: Date.now() + 10000 };
    const response = rateLimitResponse(result);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("returns error message in JSON body", async () => {
    const result = { success: false, remaining: 0, reset: Date.now() + 5000 };
    const response = rateLimitResponse(result);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("请求过于频繁");
  });

  it("Retry-After is at least 1 second", async () => {
    const result = { success: false, remaining: 0, reset: Date.now() + 100 };
    const response = rateLimitResponse(result);
    const retryAfter = Number(response.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
  });
});

describe("preset limiters", () => {
  it("loginLimiter allows 5 requests", () => {
    for (let i = 0; i < 5; i++) {
      expect(loginLimiter(`preset-login-${Date.now()}-${i}`).success).toBe(true);
    }
  });

  it("loginLimiter blocks after 5 requests for same key", () => {
    const key = `preset-login-block-${Date.now()}`;
    for (let i = 0; i < 5; i++) loginLimiter(key);
    expect(loginLimiter(key).success).toBe(false);
  });

  it("apiLimiter allows 30 requests", () => {
    const key = `preset-api-${Date.now()}`;
    for (let i = 0; i < 30; i++) {
      expect(apiLimiter(key).success).toBe(true);
    }
    expect(apiLimiter(key).success).toBe(false);
  });

  it("registerLimiter allows only 3 requests", () => {
    const key = `preset-register-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      expect(registerLimiter(key).success).toBe(true);
    }
    expect(registerLimiter(key).success).toBe(false);
  });

  it("paymentLimiter allows 5 requests", () => {
    const key = `preset-payment-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      expect(paymentLimiter(key).success).toBe(true);
    }
    expect(paymentLimiter(key).success).toBe(false);
  });

  it("contactLimiter allows only 3 requests", () => {
    const key = `preset-contact-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      expect(contactLimiter(key).success).toBe(true);
    }
    expect(contactLimiter(key).success).toBe(false);
  });

  it("orderLimiter allows 10 requests", () => {
    const key = `preset-order-${Date.now()}`;
    for (let i = 0; i < 10; i++) {
      expect(orderLimiter(key).success).toBe(true);
    }
    expect(orderLimiter(key).success).toBe(false);
  });

  it("uploadLimiter allows 10 requests", () => {
    const key = `preset-upload-${Date.now()}`;
    for (let i = 0; i < 10; i++) {
      expect(uploadLimiter(key).success).toBe(true);
    }
    expect(uploadLimiter(key).success).toBe(false);
  });
});
