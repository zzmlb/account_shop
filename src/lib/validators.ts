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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
