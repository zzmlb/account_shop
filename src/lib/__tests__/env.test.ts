import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("env", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("exports required env vars when set", async () => {
    process.env.DATABASE_URL = "postgresql://test";
    process.env.NEXTAUTH_SECRET = "test-secret";

    const { env } = await import("../env");
    expect(env.DATABASE_URL).toBe("postgresql://test");
    expect(env.NEXTAUTH_SECRET).toBe("test-secret");
  });

  it("throws when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    process.env.NEXTAUTH_SECRET = "test-secret";

    await expect(import("../env")).rejects.toThrow(
      "Missing required environment variable: DATABASE_URL"
    );
  });

  it("throws when NEXTAUTH_SECRET is missing", async () => {
    process.env.DATABASE_URL = "postgresql://test";
    delete process.env.NEXTAUTH_SECRET;

    await expect(import("../env")).rejects.toThrow(
      "Missing required environment variable: NEXTAUTH_SECRET"
    );
  });

  it("uses defaults for optional vars when not set", async () => {
    process.env.DATABASE_URL = "postgresql://test";
    process.env.NEXTAUTH_SECRET = "test-secret";
    delete process.env.CARD_KEY_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.LOG_LEVEL;
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const { env } = await import("../env");
    expect(env.CARD_KEY_SECRET).toBe("");
    expect(env.CRON_SECRET).toBe("");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.SITE_URL).toBe("http://localhost:3000");
  });

  it("reads optional vars when set", async () => {
    process.env.DATABASE_URL = "postgresql://test";
    process.env.NEXTAUTH_SECRET = "test-secret";
    process.env.CARD_KEY_SECRET = "my-card-secret";
    process.env.CRON_SECRET = "cron-123";
    process.env.LOG_LEVEL = "debug";
    process.env.NEXT_PUBLIC_SITE_URL = "https://mysite.com";

    const { env } = await import("../env");
    expect(env.CARD_KEY_SECRET).toBe("my-card-secret");
    expect(env.CRON_SECRET).toBe("cron-123");
    expect(env.LOG_LEVEL).toBe("debug");
    expect(env.SITE_URL).toBe("https://mysite.com");
  });
});
