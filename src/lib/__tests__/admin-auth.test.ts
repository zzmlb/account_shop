import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock decodeSession before importing
const decodeMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  decodeSession: (...args: unknown[]) => decodeMock(...args),
}));

import { isAdmin, getAdminSession } from "../admin-auth";

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

describe("isAdmin", () => {
  it("returns true for ADMIN", () => {
    expect(isAdmin("ADMIN")).toBe(true);
  });

  it("returns true for SUPER_ADMIN", () => {
    expect(isAdmin("SUPER_ADMIN")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("super_admin")).toBe(true);
  });

  it("returns false for USER", () => {
    expect(isAdmin("USER")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isAdmin("")).toBe(false);
  });
});

describe("getAdminSession", () => {
  beforeEach(() => {
    decodeMock.mockReset();
  });

  it("returns error 401 when no session cookie", () => {
    decodeMock.mockReturnValue(null);
    const { session, error } = getAdminSession(makeRequest());
    expect(session).toBeNull();
    expect(error).not.toBeNull();
    // NextResponse.json returns a Response; check status
    expect(error!.status).toBe(401);
  });

  it("returns error 401 when decodeSession returns null", () => {
    decodeMock.mockReturnValue(null);
    const { session, error } = getAdminSession(makeRequest("bad-token"));
    expect(session).toBeNull();
    expect(error!.status).toBe(401);
  });

  it("returns error 403 for non-admin user", () => {
    decodeMock.mockReturnValue({ id: "1", role: "USER" });
    const { session, error } = getAdminSession(makeRequest("token"));
    expect(session).toBeNull();
    expect(error!.status).toBe(403);
  });

  it("returns session for ADMIN role", () => {
    const mockSession = { id: "1", role: "ADMIN", username: "admin" };
    decodeMock.mockReturnValue(mockSession);
    const { session, error } = getAdminSession(makeRequest("token"));
    expect(error).toBeNull();
    expect(session).toEqual(mockSession);
  });

  it("returns session for SUPER_ADMIN role", () => {
    const mockSession = { id: "2", role: "SUPER_ADMIN", username: "super" };
    decodeMock.mockReturnValue(mockSession);
    const { session, error } = getAdminSession(makeRequest("token"));
    expect(error).toBeNull();
    expect(session).toEqual(mockSession);
  });
});
