import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  createOrderSchema,
  createReviewSchema,
  changePasswordSchema,
  formatZodError,
  slugify,
} from "../validators";

describe("loginSchema", () => {
  it("accepts valid login input", () => {
    const result = loginSchema.safeParse({
      username: "testuser",
      password: "pass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty username", () => {
    const result = loginSchema.safeParse({
      username: "",
      password: "pass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      username: "testuser",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts valid registration", () => {
    const result = registerSchema.safeParse({
      username: "newuser",
      email: "user@example.com",
      password: "Pass123",
      confirmPassword: "Pass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      username: "newuser",
      email: "user@example.com",
      password: "Pass123",
      confirmPassword: "DifferentPass1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = registerSchema.safeParse({
      username: "newuser",
      email: "user@example.com",
      password: "NoNumbers",
      confirmPassword: "NoNumbers",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without letter", () => {
    const result = registerSchema.safeParse({
      username: "newuser",
      email: "user@example.com",
      password: "123456",
      confirmPassword: "123456",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      username: "newuser",
      email: "not-an-email",
      password: "Pass123",
      confirmPassword: "Pass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects username with special chars", () => {
    const result = registerSchema.safeParse({
      username: "user@name",
      email: "user@example.com",
      password: "Pass123",
      confirmPassword: "Pass123",
    });
    expect(result.success).toBe(false);
  });

  it("allows Chinese username", () => {
    const result = registerSchema.safeParse({
      username: "用户名",
      email: "user@example.com",
      password: "Pass123",
      confirmPassword: "Pass123",
    });
    expect(result.success).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "bad-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  it("accepts valid order", () => {
    const result = createOrderSchema.safeParse({
      items: [{ productId: "abc123", quantity: 1 }],
      paymentMethod: "balance",
      email: "buyer@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const result = createOrderSchema.safeParse({
      items: [],
      paymentMethod: "balance",
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity of 0", () => {
    const result = createOrderSchema.safeParse({
      items: [{ productId: "abc123", quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity over 99", () => {
    const result = createOrderSchema.safeParse({
      items: [{ productId: "abc123", quantity: 100 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("createReviewSchema", () => {
  it("accepts valid review", () => {
    const result = createReviewSchema.safeParse({
      productId: "prod1",
      rating: 5,
      content: "这个商品非常好用！",
    });
    expect(result.success).toBe(true);
  });

  it("rejects rating above 5", () => {
    const result = createReviewSchema.safeParse({
      productId: "prod1",
      rating: 6,
      content: "Great product",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too short content", () => {
    const result = createReviewSchema.safeParse({
      productId: "prod1",
      rating: 3,
      content: "好",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts valid password change", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPass1",
      newPassword: "NewPass1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects new password without letter", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPass1",
      newPassword: "123456",
    });
    expect(result.success).toBe(false);
  });
});

describe("formatZodError", () => {
  it("joins multiple error messages", () => {
    const result = loginSchema.safeParse({
      username: "",
      password: "",
    });
    if (!result.success) {
      const msg = formatZodError(result.error);
      expect(msg).toBeTruthy();
      expect(typeof msg).toBe("string");
    }
  });
});
