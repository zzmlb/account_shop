import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  createOrderSchema,
  createReviewSchema,
  changePasswordSchema,
  formatZodError,
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  updateCategorySchema,
  createCouponSchema,
  updateCouponSchema,
  createArticleSchema,
  updateArticleSchema,
  favoriteSchema,
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

describe("createProductSchema", () => {
  it("accepts valid product", () => {
    const result = createProductSchema.safeParse({
      name: "测试商品",
      description: "商品描述",
      price: 9.99,
      categoryId: "cat-1",
      stockCount: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createProductSchema.safeParse({
      name: "",
      description: "描述",
      price: 9.99,
      categoryId: "cat-1",
      stockCount: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = createProductSchema.safeParse({
      name: "商品",
      description: "描述",
      price: -1,
      categoryId: "cat-1",
      stockCount: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative stock", () => {
    const result = createProductSchema.safeParse({
      name: "商品",
      description: "描述",
      price: 10,
      categoryId: "cat-1",
      stockCount: -5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createProductSchema.safeParse({
      name: "商品",
      description: "描述",
      price: 10,
      categoryId: "cat-1",
      stockCount: 10,
      originalPrice: 20,
      tags: ["tag1", "tag2"],
      isActive: true,
      deliveryType: "AUTO",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid deliveryType", () => {
    const result = createProductSchema.safeParse({
      name: "商品",
      description: "描述",
      price: 10,
      categoryId: "cat-1",
      stockCount: 10,
      deliveryType: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateProductSchema", () => {
  it("accepts partial update", () => {
    const result = updateProductSchema.safeParse({ price: 19.99 });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no fields required)", () => {
    const result = updateProductSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects negative stockCount", () => {
    const result = updateProductSchema.safeParse({ stockCount: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects images array exceeding max 8", () => {
    const result = updateProductSchema.safeParse({
      images: Array.from({ length: 9 }, (_, i) => `img${i}.jpg`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts nullable originalPrice", () => {
    const result = updateProductSchema.safeParse({ originalPrice: null });
    expect(result.success).toBe(true);
  });
});

describe("createCategorySchema", () => {
  it("accepts valid category", () => {
    const result = createCategorySchema.safeParse({
      name: "电子邮箱",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createCategorySchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createCategorySchema.safeParse({
      name: "VPN服务",
      description: "各类VPN服务",
      icon: "Shield",
      sortOrder: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateCategorySchema", () => {
  it("requires id", () => {
    const result = updateCategorySchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(false);
  });

  it("accepts valid update with id", () => {
    const result = updateCategorySchema.safeParse({
      id: "cat-1",
      name: "Updated",
      isActive: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("createCouponSchema", () => {
  it("accepts valid fixed coupon", () => {
    const result = createCouponSchema.safeParse({
      code: "SAVE10",
      type: "FIXED",
      value: 10,
      startAt: "2026-01-01T00:00:00Z",
      expireAt: "2026-12-31T23:59:59Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid percentage coupon", () => {
    const result = createCouponSchema.safeParse({
      code: "OFF20",
      type: "PERCENTAGE",
      value: 20,
      minAmount: 100,
      maxUses: 50,
      startAt: "2026-01-01T00:00:00Z",
      expireAt: "2026-12-31T23:59:59Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid coupon type", () => {
    const result = createCouponSchema.safeParse({
      code: "BAD",
      type: "INVALID",
      value: 10,
      startAt: "2026-01-01",
      expireAt: "2026-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty code", () => {
    const result = createCouponSchema.safeParse({
      code: "",
      type: "FIXED",
      value: 10,
      startAt: "2026-01-01",
      expireAt: "2026-12-31",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCouponSchema", () => {
  it("requires id", () => {
    const result = updateCouponSchema.safeParse({ isActive: false });
    expect(result.success).toBe(false);
  });

  it("accepts valid coupon update", () => {
    const result = updateCouponSchema.safeParse({
      id: "coupon-1",
      isActive: false,
      maxUses: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects maxUses of 0", () => {
    const result = updateCouponSchema.safeParse({
      id: "coupon-1",
      maxUses: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("createArticleSchema", () => {
  it("accepts valid article", () => {
    const result = createArticleSchema.safeParse({
      title: "使用指南",
      content: "这是一篇帮助文章的内容...",
      category: "guide",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createArticleSchema.safeParse({
      title: "",
      content: "内容",
      category: "guide",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = createArticleSchema.safeParse({
      title: "标题",
      content: "",
      category: "guide",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateArticleSchema", () => {
  it("accepts partial update", () => {
    const result = updateArticleSchema.safeParse({ title: "New Title" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateArticleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects content exceeding 100000 chars", () => {
    const result = updateArticleSchema.safeParse({
      content: "a".repeat(100001),
    });
    expect(result.success).toBe(false);
  });
});

describe("favoriteSchema", () => {
  it("accepts valid productId", () => {
    const result = favoriteSchema.safeParse({ productId: "prod-123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty productId", () => {
    const result = favoriteSchema.safeParse({ productId: "" });
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
