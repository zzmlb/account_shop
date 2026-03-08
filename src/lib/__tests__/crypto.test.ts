import { describe, it, expect, beforeAll } from "vitest";

// Set env before importing module
beforeAll(() => {
  process.env.CARD_KEY_SECRET = "test-secret-key-at-least-32-chars!!";
});

import {
  encryptCardKey,
  decryptCardKey,
  safeDecryptCardKey,
  isEncrypted,
} from "../crypto";

describe("encryptCardKey / decryptCardKey", () => {
  it("encrypts and decrypts a string correctly", () => {
    const plaintext = "ABCD-1234-EFGH-5678";
    const encrypted = encryptCardKey(plaintext);
    const decrypted = decryptCardKey(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same input (random IV)", () => {
    const plaintext = "same-input";
    const a = encryptCardKey(plaintext);
    const b = encryptCardKey(plaintext);
    expect(a).not.toBe(b);
    // Both should still decrypt to same value
    expect(decryptCardKey(a)).toBe(plaintext);
    expect(decryptCardKey(b)).toBe(plaintext);
  });

  it("handles empty string", () => {
    const encrypted = encryptCardKey("");
    expect(decryptCardKey(encrypted)).toBe("");
  });

  it("handles unicode content", () => {
    const plaintext = "密钥-123-卡密";
    const encrypted = encryptCardKey(plaintext);
    expect(decryptCardKey(encrypted)).toBe(plaintext);
  });

  it("returns plain text for legacy non-encrypted values", () => {
    expect(decryptCardKey("plain-legacy-key")).toBe("plain-legacy-key");
  });
});

describe("safeDecryptCardKey", () => {
  it("decrypts valid ciphertext", () => {
    const encrypted = encryptCardKey("test-key");
    expect(safeDecryptCardKey(encrypted)).toBe("test-key");
  });

  it("returns fallback for corrupted ciphertext", () => {
    const corrupted = "bad:data:here";
    expect(safeDecryptCardKey(corrupted)).toBe("[解密失败]");
  });
});

describe("isEncrypted", () => {
  it("returns true for encrypted format (iv:data:tag)", () => {
    const encrypted = encryptCardKey("test");
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(isEncrypted("plain-key")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isEncrypted("")).toBe(false);
  });

  it("returns false for two-part string", () => {
    expect(isEncrypted("part1:part2")).toBe(false);
  });

  it("returns false if any part is empty", () => {
    expect(isEncrypted("::")).toBe(false);
    expect(isEncrypted("a::b")).toBe(false);
  });

  it("returns false for trailing colon", () => {
    expect(isEncrypted("a:b:")).toBe(false);
  });
});

describe("crypto edge cases", () => {
  it("handles very long plaintext", () => {
    const long = "A".repeat(10000);
    const encrypted = encryptCardKey(long);
    expect(decryptCardKey(encrypted)).toBe(long);
  });

  it("handles special characters", () => {
    const special = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";
    const encrypted = encryptCardKey(special);
    expect(decryptCardKey(encrypted)).toBe(special);
  });

  it("handles emoji content", () => {
    const emoji = "\u{1F511}\u{1F3AE}\u{1F4B0}\u{2728}";
    const encrypted = encryptCardKey(emoji);
    expect(decryptCardKey(encrypted)).toBe(emoji);
  });

  it("safeDecryptCardKey returns fallback for tampered ciphertext", () => {
    const encrypted = encryptCardKey("test-key");
    const parts = encrypted.split(":");
    parts[1] = parts[1].slice(0, -4) + "XXXX";
    const tampered = parts.join(":");
    expect(safeDecryptCardKey(tampered)).toBe("[解密失败]");
  });

  it("safeDecryptCardKey returns fallback for tampered auth tag", () => {
    const encrypted = encryptCardKey("test-key");
    const parts = encrypted.split(":");
    parts[2] = "AAAA" + parts[2].slice(4);
    const tampered = parts.join(":");
    expect(safeDecryptCardKey(tampered)).toBe("[解密失败]");
  });

  it("handles whitespace-only plaintext", () => {
    const whitespace = "   \t\n  ";
    const encrypted = encryptCardKey(whitespace);
    expect(decryptCardKey(encrypted)).toBe(whitespace);
  });
});
