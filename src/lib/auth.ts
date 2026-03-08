import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Simple JWT-like session using cookies (will be replaced with NextAuth later)
// For now, we store user info in a signed cookie

export interface SessionUser {
  id: string;
  username: string;
  email: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  avatar: string | null;
}

// Encode session data as base64 (simplified for dev - use proper JWT in production)
export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString("base64");
}

export function decodeSession(token: string): SessionUser | null {
  try {
    const data = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
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
