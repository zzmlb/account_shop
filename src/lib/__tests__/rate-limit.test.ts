import { describe, it, expect } from "vitest";
import { rateLimit } from "../rate-limit";

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
