import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;
const SESSION_SECRET =
  process.env.NEXTAUTH_SECRET || "pj37-dev-fallback-secret-change-in-prod";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export interface SessionUser {
  id: string;
  username: string;
  email: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  avatar: string | null;
}

/**
 * Encode session data as HMAC-signed token.
 * Format: base64(payload).hex(hmac_sha256)
 */
export function encodeSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

/**
 * Decode and verify an HMAC-signed session token.
 * Returns null if signature is invalid or data is malformed.
 */
export function decodeSession(token: string): SessionUser | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return null;

    const payload = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    if (!payload || !sig) return null;

    // Verify HMAC signature
    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8")
    );
    if (data && data.id && data.username) {
      return data as SessionUser;
    }
    return null;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): SessionUser | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  return decodeSession(token);
}
