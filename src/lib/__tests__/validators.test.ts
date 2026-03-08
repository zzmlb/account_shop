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
  contactMessageSchema,
  broadcastNotificationSchema,
  resetPasswordSchema,
  updateEmailSchema,
  updateProfileSchema,
  deleteAccountSchema,
  refundRequestSchema,
  claimCouponSchema,
  validateCouponSchema,
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

  it("rejects more than 50 item types", () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      productId: `prod-${i}`,
      quantity: 1,
    }));
    const result = createOrderSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });

  it("accepts order without optional fields", () => {
    const result = createOrderSchema.safeParse({
      items: [{ productId: "abc", quantity: 2 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty productId", () => {
    const result = createOrderSchema.safeParse({
      items: [{ productId: "", quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty email string", () => {
    const result = createOrderSchema.safeParse({
      items: [{ productId: "abc", quantity: 1 }],
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = createOrderSchema.safeParse({
      items: [{ productId: "abc", quantity: 1 }],
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts couponCode up to 50 chars", () => {
    const result = createOrderSchema.safeParse({
      items: [{ productId: "abc", quantity: 1 }],
      couponCode: "A".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-integer quantity", () => {
    const result = createOrderSchema.safeParse({
      items: [{ productId: "abc", quantity: 1.5 }],
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

  it("rejects rating below 1", () => {
    const result = createReviewSchema.safeParse({
      productId: "prod1",
      rating: 0,
      content: "Very bad product",
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

  it("rejects content exceeding 1000 chars", () => {
    const result = createReviewSchema.safeParse({
      productId: "prod1",
      rating: 4,
      content: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts content at exactly 1000 chars", () => {
    const result = createReviewSchema.safeParse({
      productId: "prod1",
      rating: 4,
      content: "x".repeat(1000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty productId", () => {
    const result = createReviewSchema.safeParse({
      productId: "",
      rating: 3,
      content: "Some review content",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer rating", () => {
    const result = createReviewSchema.safeParse({
      productId: "prod1",
      rating: 3.5,
      content: "Good enough product",
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

  it("rejects new password without number", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPass1",
      newPassword: "abcdefgh",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "NewPass1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password shorter than 6 chars", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPass1",
      newPassword: "Ab1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password exceeding 50 chars", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPass1",
      newPassword: "A1" + "x".repeat(49),
    });
    expect(result.success).toBe(false);
  });

  it("accepts password with special characters", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old",
      newPassword: "P@ssw0rd!",
    });
    expect(result.success).toBe(true);
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

describe("contactMessageSchema", () => {
  it("accepts valid contact message", () => {
    const result = contactMessageSchema.safeParse({
      name: "张三",
      email: "zhangsan@example.com",
      subject: "购买问题",
      message: "我购买的商品无法使用，请帮忙处理。",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short name", () => {
    const result = contactMessageSchema.safeParse({
      name: "A",
      email: "a@b.com",
      subject: "主题",
      message: "这是一条足够长的留言内容。",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = contactMessageSchema.safeParse({
      name: "张三",
      email: "not-email",
      subject: "主题",
      message: "这是一条足够长的留言内容。",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short message", () => {
    const result = contactMessageSchema.safeParse({
      name: "张三",
      email: "a@b.com",
      subject: "主题",
      message: "太短",
    });
    expect(result.success).toBe(false);
  });

  it("rejects message exceeding 2000 chars", () => {
    const result = contactMessageSchema.safeParse({
      name: "张三",
      email: "a@b.com",
      subject: "主题",
      message: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional category", () => {
    const result = contactMessageSchema.safeParse({
      name: "张三",
      email: "a@b.com",
      subject: "主题",
      message: "留言内容足够长的文本。",
      category: "support",
    });
    expect(result.success).toBe(true);
  });
});

describe("broadcastNotificationSchema", () => {
  it("accepts valid broadcast", () => {
    const result = broadcastNotificationSchema.safeParse({
      title: "系统维护通知",
      content: "系统将于今晚 22:00 进行维护，预计持续2小时。",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = broadcastNotificationSchema.safeParse({
      title: "",
      content: "内容",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = broadcastNotificationSchema.safeParse({
      title: "标题",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding 200 chars", () => {
    const result = broadcastNotificationSchema.safeParse({
      title: "x".repeat(201),
      content: "内容",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content exceeding 2000 chars", () => {
    const result = broadcastNotificationSchema.safeParse({
      title: "标题",
      content: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional href and userIds", () => {
    const result = broadcastNotificationSchema.safeParse({
      title: "新品上线",
      content: "查看最新商品",
      href: "/products/new-item",
      userIds: ["user-1", "user-2"],
    });
    expect(result.success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts valid reset", () => {
    const result = resetPasswordSchema.safeParse({ token: "abc123", password: "Pass1234" });
    expect(result.success).toBe(true);
  });

  it("rejects empty token", () => {
    const result = resetPasswordSchema.safeParse({ token: "", password: "Pass1234" });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = resetPasswordSchema.safeParse({ token: "abc", password: "Ab1" });
    expect(result.success).toBe(false);
  });

  it("rejects password without letter", () => {
    const result = resetPasswordSchema.safeParse({ token: "abc", password: "123456" });
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = resetPasswordSchema.safeParse({ token: "abc", password: "abcdef" });
    expect(result.success).toBe(false);
  });
});

describe("updateEmailSchema", () => {
  it("accepts valid email and transforms", () => {
    const result = updateEmailSchema.safeParse({ email: " Test@Example.COM " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });

  it("rejects invalid email", () => {
    const result = updateEmailSchema.safeParse({ email: "not-email" });
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts avatar url", () => {
    const result = updateProfileSchema.safeParse({ avatar: "https://example.com/avatar.jpg" });
    expect(result.success).toBe(true);
  });

  it("accepts null avatar", () => {
    const result = updateProfileSchema.safeParse({ avatar: null });
    expect(result.success).toBe(true);
  });

  it("rejects avatar over 500 chars", () => {
    const result = updateProfileSchema.safeParse({ avatar: "x".repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe("deleteAccountSchema", () => {
  it("accepts password", () => {
    const result = deleteAccountSchema.safeParse({ password: "myPassword" });
    expect(result.success).toBe(true);
  });

  it("rejects empty password", () => {
    const result = deleteAccountSchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
  });
});

describe("refundRequestSchema", () => {
  it("accepts valid refund", () => {
    const result = refundRequestSchema.safeParse({ orderId: "ord-1", reason: "商品无法使用" });
    expect(result.success).toBe(true);
  });

  it("rejects short reason", () => {
    const result = refundRequestSchema.safeParse({ orderId: "ord-1", reason: "短" });
    expect(result.success).toBe(false);
  });

  it("rejects reason over 500 chars", () => {
    const result = refundRequestSchema.safeParse({ orderId: "ord-1", reason: "x".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects empty orderId", () => {
    const result = refundRequestSchema.safeParse({ orderId: "", reason: "退款原因说明" });
    expect(result.success).toBe(false);
  });
});

describe("claimCouponSchema", () => {
  it("accepts valid code and transforms to uppercase", () => {
    const result = claimCouponSchema.safeParse({ code: "  save10  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("SAVE10");
    }
  });

  it("rejects single char code", () => {
    const result = claimCouponSchema.safeParse({ code: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects code with special characters", () => {
    const result = claimCouponSchema.safeParse({ code: "SAVE@10" });
    expect(result.success).toBe(false);
  });
});

describe("validateCouponSchema", () => {
  it("accepts valid code and amount", () => {
    const result = validateCouponSchema.safeParse({ code: "save10", amount: 100 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("SAVE10");
    }
  });

  it("rejects zero amount", () => {
    const result = validateCouponSchema.safeParse({ code: "SAVE10", amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = validateCouponSchema.safeParse({ code: "SAVE10", amount: -5 });
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
