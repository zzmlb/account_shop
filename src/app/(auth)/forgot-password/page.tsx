"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";

import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (_data: ForgotPasswordInput) => {
    try {
      // Mock: simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setEmailSent(true);
      toast.success("邮件已发送", {
        description: "重置链接已发送到您的邮箱",
      });
    } catch {
      toast.error("发送失败", {
        description: "请稍后重试",
      });
    }
  };

  return (
    <div className="p-6 sm:p-8">
      {!emailSent ? (
        <>
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20">
              <Mail className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              忘记密码
            </h1>
            <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
              输入您的注册邮箱，我们将发送密码重置链接
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入注册时使用的邮箱"
                autoComplete="email"
                className={cn(
                  "bg-[var(--background)]",
                  errors.email && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"
                )}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-[var(--destructive)]">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  发送重置链接
                </>
              )}
            </Button>
          </form>
        </>
      ) : (
        /* Success state */
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20">
            <CheckCircle className="h-6 w-6 text-[var(--success)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            邮件已发送
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
            重置链接已发送到您的邮箱，请查收邮件并按照指引重置密码。
            <br />
            如未收到邮件，请检查垃圾邮件文件夹。
          </p>
        </div>
      )}

      {/* Back to login */}
      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登录
        </Link>
      </div>
    </div>
  );
}
