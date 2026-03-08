"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn, Github, Chrome } from "lucide-react";

import { loginSchema, type LoginInput } from "@/lib/validators";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const login = useAuthStore((s) => s.login);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, rememberMe }),
      });

      const result = await res.json();

      if (result.success) {
        login(result.user);
        toast.success("登录成功", {
          description: `欢迎回来，${result.user.username}`,
        });
        const redirectTo = searchParams.get("from") || "/";
        router.push(redirectTo);
      } else {
        toast.error("登录失败", {
          description: result.message || "用户名或密码错误",
        });
      }
    } catch {
      toast.error("网络错误", {
        description: "请检查网络连接后重试",
      });
    }
  };

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          欢迎回来
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          登录您的账户以继续
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">用户名</Label>
          <Input
            id="username"
            placeholder="请输入用户名"
            autoComplete="username"
            autoFocus
            minLength={2}
            maxLength={20}
            className={cn(
              "bg-[var(--background)]",
              errors.username && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"
            )}
            {...register("username")}
          />
          {errors.username && (
            <p role="alert" className="text-xs text-[var(--destructive)]">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">密码</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
            >
              忘记密码?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="请输入密码"
              autoComplete="current-password"
              minLength={6}
              maxLength={50}
              className={cn(
                "bg-[var(--background)] pr-10",
                errors.password && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"
              )}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p role="alert" className="text-xs text-[var(--destructive)]">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(v) => setRememberMe(v === true)}
          />
          <label
            htmlFor="remember"
            className="text-sm text-[var(--muted-foreground)] cursor-pointer select-none"
          >
            记住我
          </label>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              登录中...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              登录
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[var(--card)] px-3 text-[var(--muted-foreground)]">
            或使用以下方式登录
          </span>
        </div>
      </div>

      {/* Social login buttons (coming soon) */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" disabled className="w-full relative">
          <Github className="h-4 w-4" />
          GitHub
          <span className="absolute -top-2 -right-2 rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--muted-foreground)]">
            即将上线
          </span>
        </Button>
        <Button variant="outline" disabled className="w-full relative">
          <Chrome className="h-4 w-4" />
          Google
          <span className="absolute -top-2 -right-2 rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--muted-foreground)]">
            即将上线
          </span>
        </Button>
      </div>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        还没有账户?{" "}
        <Link
          href="/register"
          className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          立即注册
        </Link>
      </p>
    </div>
  );
}
