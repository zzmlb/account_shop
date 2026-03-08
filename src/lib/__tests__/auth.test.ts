import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  encodeSession,
  decodeSession,
  getUserSession,
  type SessionUser,
} from "../auth";

describe("hashPassword / verifyPassword", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("MyPassword123");
    expect(hash).not.toBe("MyPassword123");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt hash prefix

    const valid = await verifyPassword("MyPassword123", hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("CorrectPassword1");
    const valid = await verifyPassword("WrongPassword1", hash);
    expect(valid).toBe(false);
  });

  it("produces different hashes for same password (different salts)", async () => {
    const h1 = await hashPassword("SamePass1");
    const h2 = await hashPassword("SamePass1");
    expect(h1).not.toBe(h2);
  });
});

describe("encodeSession / decodeSession", () => {
  const testUser: SessionUser = {
    id: "user-123",
    username: "testuser",
    email: "test@example.com",
    role: "USER",
    avatar: null,
  };

  it("encodes and decodes a session token", () => {
    const token = encodeSession(testUser);
    const decoded = decodeSession(token);
    expect(decoded).toEqual(testUser);
  });

  it("returns null for empty string", () => {
    expect(decodeSession("")).toBe(null);
  });

  it("returns null for token without dot", () => {
    expect(decodeSession("nodothere")).toBe(null);
  });

  it("returns null for tampered payload", () => {
    const token = encodeSession(testUser);
    const sig = token.split(".").pop()!;
    // Tamper with the payload
    const tampered = Buffer.from('{"id":"hacker","username":"evil","role":"ADMIN"}').toString("base64");
    const result = decodeSession(`${tampered}.${sig}`);
    expect(result).toBe(null);
  });

  it("returns null for tampered signature", () => {
    const token = encodeSession(testUser);
    const dotIdx = token.lastIndexOf(".");
    const payload = token.slice(0, dotIdx);
    const result = decodeSession(`${payload}.badsignature`);
    expect(result).toBe(null);
  });

  it("preserves admin role", () => {
    const admin: SessionUser = {
      id: "admin-1",
      username: "admin",
      email: "admin@example.com",
      role: "ADMIN",
      avatar: "/avatars/admin.png",
    };
    const token = encodeSession(admin);
    const decoded = decodeSession(token);
    expect(decoded?.role).toBe("ADMIN");
    expect(decoded?.avatar).toBe("/avatars/admin.png");
  });
});

describe("getUserSession", () => {
  const testUser: SessionUser = {
    id: "user-1",
    username: "testuser",
    email: "test@example.com",
    role: "USER",
    avatar: null,
  };

  function makeRequest(sessionValue?: string) {
    return {
      cookies: {
        get: (name: string) =>
          name === "session" && sessionValue
            ? { value: sessionValue }
            : undefined,
      },
    } as never;
  }

  it("returns session for valid token", () => {
    const token = encodeSession(testUser);
    const { session, error } = getUserSession(makeRequest(token));
    expect(error).toBeNull();
    expect(session).toEqual(testUser);
  });

  it("returns 401 error when no session cookie", () => {
    const { session, error } = getUserSession(makeRequest());
    expect(session).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(401);
  });

  it("returns 401 error for invalid token", () => {
    const { session, error } = getUserSession(makeRequest("bad-token"));
    expect(session).toBeNull();
    expect(error!.status).toBe(401);
  });

  it("works for admin users too", () => {
    const admin: SessionUser = {
      id: "admin-1",
      username: "admin",
      email: "admin@test.com",
      role: "ADMIN",
      avatar: null,
    };
    const token = encodeSession(admin);
    const { session, error } = getUserSession(makeRequest(token));
    expect(error).toBeNull();
    expect(session?.role).toBe("ADMIN");
  });
});
