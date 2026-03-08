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
});
