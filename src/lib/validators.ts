import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(2, "用户名至少2个字符")
    .max(20, "用户名最多20个字符"),
  password: z
    .string()
    .min(6, "密码至少6个字符")
    .max(50, "密码最多50个字符"),
});

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(2, "用户名至少2个字符")
      .max(20, "用户名最多20个字符")
      .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线或中文"),
    email: z
      .string()
      .email("请输入有效的邮箱地址"),
    password: z
      .string()
      .min(6, "密码至少6个字符")
      .max(50, "密码最多50个字符"),
    confirmPassword: z
      .string()
      .min(1, "请确认密码"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("请输入有效的邮箱地址"),
});

/* ------------------------------------------------------------------ */
/*  Helper: format Zod errors into a single message                    */
/* ------------------------------------------------------------------ */

export function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => e.message).join("; ");
}

/* ------------------------------------------------------------------ */
/*  Admin: Products                                                    */
/* ------------------------------------------------------------------ */

export const createProductSchema = z.object({
  name: z.string().min(1, "商品名称不能为空").max(200, "商品名称最多200个字符"),
  slug: z.string().max(200).optional(),
  description: z.string().min(1, "商品描述不能为空").max(10000, "描述最多10000个字符"),
  price: z.number().min(0, "价格不能为负数"),
  categoryId: z.string().min(1, "请选择分类"),
  stockCount: z.number().int("库存必须为整数").min(0, "库存不能为负数"),
  originalPrice: z.number().min(0, "原价不能为负数").nullable().optional(),
  tags: z.array(z.string()).optional(),
  image: z.string().url("图片地址格式不正确").nullable().optional(),
  isActive: z.boolean().optional(),
  deliveryType: z.enum(["AUTO", "MANUAL"]).optional(),
  afterSaleHours: z.number().int().min(0).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().max(200).optional(),
  description: z.string().min(1).max(10000).optional(),
  price: z.number().min(0).optional(),
  categoryId: z.string().min(1).optional(),
  stockCount: z.number().int().min(0).optional(),
  originalPrice: z.number().min(0).nullable().optional(),
  tags: z.array(z.string()).optional(),
  image: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  deliveryType: z.enum(["AUTO", "MANUAL"]).optional(),
  afterSaleHours: z.number().int().min(0).optional(),
});

/* ------------------------------------------------------------------ */
/*  Admin: Categories                                                  */
/* ------------------------------------------------------------------ */

export const createCategorySchema = z.object({
  name: z.string().min(1, "分类名称不能为空").max(100, "分类名称最多100个字符"),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = z.object({
  id: z.string().min(1, "缺少分类ID"),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

/* ------------------------------------------------------------------ */
/*  Admin: Coupons                                                     */
/* ------------------------------------------------------------------ */

export const createCouponSchema = z.object({
  code: z.string().min(1, "优惠码不能为空").max(50, "优惠码最多50个字符"),
  type: z.enum(["FIXED", "PERCENTAGE"], { message: "优惠类型无效" }),
  value: z.number().min(0, "优惠值不能为负数"),
  minAmount: z.number().min(0).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  startAt: z.string().min(1, "请选择开始时间"),
  expireAt: z.string().min(1, "请选择结束时间"),
});

export const updateCouponSchema = z.object({
  id: z.string().min(1, "缺少优惠券ID"),
  isActive: z.boolean().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  minAmount: z.number().min(0).nullable().optional(),
  expireAt: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/*  Admin: Articles                                                    */
/* ------------------------------------------------------------------ */

export const createArticleSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题最多200个字符"),
  slug: z.string().max(200).optional(),
  content: z.string().min(1, "内容不能为空").max(100000, "内容过长"),
  category: z.string().min(1, "请选择分类"),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().max(200).optional(),
  content: z.string().min(1).max(100000).optional(),
  category: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

/* ------------------------------------------------------------------ */
/*  Orders                                                             */
/* ------------------------------------------------------------------ */

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "商品ID不能为空"),
        quantity: z.number().int().min(1, "数量至少为1"),
      })
    )
    .min(1, "订单商品不能为空"),
  paymentMethod: z.string().optional(),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  couponCode: z.string().max(50).optional(),
});

/* ------------------------------------------------------------------ */
/*  Reviews                                                            */
/* ------------------------------------------------------------------ */

export const createReviewSchema = z.object({
  productId: z.string().min(1, "缺少商品ID"),
  rating: z.number().int().min(1, "评分至少1星").max(5, "评分最多5星"),
  content: z.string().min(2, "评价内容至少2个字符").max(1000, "评价内容最多1000个字符"),
});

/* ------------------------------------------------------------------ */
/*  Auth: Password Change                                              */
/* ------------------------------------------------------------------ */

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(6, "新密码至少6个字符").max(50, "密码最多50个字符"),
});

/* ------------------------------------------------------------------ */
/*  Favorites                                                          */
/* ------------------------------------------------------------------ */

export const favoriteSchema = z.object({
  productId: z.string().min(1, "缺少商品ID"),
});

/* ------------------------------------------------------------------ */
/*  Type Exports                                                       */
/* ------------------------------------------------------------------ */

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
