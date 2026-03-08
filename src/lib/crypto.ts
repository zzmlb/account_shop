import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length

function getKey(): Buffer {
  const secret = process.env.CARD_KEY_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("CARD_KEY_SECRET must be at least 32 characters");
  }
  // Use first 32 bytes of the secret as the key
  return Buffer.from(secret.slice(0, 32), "utf-8");
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a base64 string in the format: iv:encrypted:authTag
 */
export function encryptCardKey(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf-8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${encrypted}:${authTag.toString("base64")}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Expects format: iv:encrypted:authTag (base64 encoded parts)
 */
export function decryptCardKey(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    // Not encrypted (legacy plain text) - return as-is
    return ciphertext;
  }

  const iv = Buffer.from(parts[0], "base64");
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "base64", "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
}

/**
 * Safe version of decryptCardKey that returns a fallback on failure
 * instead of throwing, preventing a single corrupted key from
 * crashing the entire API response.
 */
export function safeDecryptCardKey(ciphertext: string): string {
  try {
    return decryptCardKey(ciphertext);
  } catch {
    return "[解密失败]";
  }
}

/**
 * Check if a string appears to be encrypted (has the iv:data:tag format).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}
