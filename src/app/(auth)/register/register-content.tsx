"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, UserPlus, CheckCircle2, XCircle } from "lucide-react";

import { registerSchema, type RegisterInput } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

function getPasswordStrength(password: string): {
  level: "weak" | "medium" | "strong";
  label: string;
  color: string;
  width: string;
} {
  if (!password || password.length === 0) {
    return { level: "weak", label: "", color: "", width: "0%" };
  }

  let score = 0;

  // Length scoring
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;

  // Character diversity scoring
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 3) {
    return {
      level: "weak",
      label: "弱",
      color: "bg-[var(--destructive)]",
      width: "33%",
    };
  }
  if (score <= 5) {
    return {
      level: "medium",
      label: "中",
      color: "bg-[var(--warning)]",
      width: "66%",
    };
  }
  return {
    level: "strong",
    label: "强",
    color: "bg-[var(--success)]",
    width: "100%",
  };
}

export default function RegisterContent() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const watchedUsername = watch("username");
  const watchedPassword = watch("password");

  // Debounced username availability check
  useEffect(() => {
    if (!watchedUsername || watchedUsername.length < 2) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    usernameTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(watchedUsername)}`);
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
    return () => {
      if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    };
  }, [watchedUsername]);
  const watchedConfirmPassword = watch("confirmPassword");
  const passwordStrength = useMemo(
    () => getPasswordStrength(watchedPassword),
    [watchedPassword]
  );
  const passwordsMatch =
    watchedConfirmPassword &&
    watchedConfirmPassword.length > 0 &&
    watchedPassword === watchedConfirmPassword;

  const onSubmit = async (data: RegisterInput) => {
    if (!agreedToTerms) {
      toast.error("请先同意服务条款和隐私政策");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("注册成功", {
          description: "请使用新账户登录",
        });
        router.push("/login");
      } else {
        toast.error("注册失败", {
          description: result.message || "请稍后重试",
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
          创建账户
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          注册以开始您的数字商品之旅
        </p>
      </div>

      {/* Register Form */}
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
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? "username-error" : undefined}
            className={cn(
              "bg-[var(--background)]",
              errors.username && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"
            )}
            {...register("username")}
          />
          <div aria-live="polite" aria-atomic="true">
            {errors.username && (
              <p id="username-error" role="alert" className="text-xs text-[var(--destructive)]">
                {errors.username.message}
              </p>
            )}
          </div>
          {!errors.username && usernameStatus === "checking" && (
            <p className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              检查用户名是否可用...
            </p>
          )}
          {!errors.username && usernameStatus === "available" && (
            <p className="flex items-center gap-1 text-xs text-[var(--success)]">
              <CheckCircle2 className="h-3 w-3" />
              用户名可用
            </p>
          )}
          {!errors.username && usernameStatus === "taken" && (
            <p className="flex items-center gap-1 text-xs text-[var(--destructive)]">
              <XCircle className="h-3 w-3" />
              用户名已被占用
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            placeholder="请输入邮箱地址"
            autoComplete="email"
            maxLength={100}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={cn(
              "bg-[var(--background)]",
              errors.email && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"
            )}
            {...register("email")}
          />
          <div aria-live="polite" aria-atomic="true">
            {errors.email && (
              <p id="email-error" role="alert" className="text-xs text-[var(--destructive)]">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="请输入密码 (至少6位)"
              autoComplete="new-password"
              minLength={6}
              maxLength={50}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
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
          <div aria-live="polite" aria-atomic="true">
            {errors.password && (
              <p id="password-error" role="alert" className="text-xs text-[var(--destructive)]">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Password strength indicator */}
          {watchedPassword && watchedPassword.length > 0 && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-[var(--secondary)] overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-300", passwordStrength.color)}
                  style={{ width: passwordStrength.width }}
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                密码强度:{" "}
                <span
                  className={cn(
                    "font-medium",
                    passwordStrength.level === "weak" && "text-[var(--destructive)]",
                    passwordStrength.level === "medium" && "text-[var(--warning)]",
                    passwordStrength.level === "strong" && "text-[var(--success)]"
                  )}
                >
                  {passwordStrength.label}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="请再次输入密码"
              autoComplete="new-password"
              minLength={6}
              maxLength={50}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              className={cn(
                "bg-[var(--background)] pr-10",
                errors.confirmPassword && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"
              )}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              tabIndex={-1}
              aria-label={showConfirmPassword ? "隐藏确认密码" : "显示确认密码"}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <div aria-live="polite" aria-atomic="true">
            {errors.confirmPassword && (
              <p id="confirm-password-error" role="alert" className="text-xs text-[var(--destructive)]">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          {!errors.confirmPassword && passwordsMatch && (
            <p className="text-xs text-[var(--success)]">
              密码匹配
            </p>
          )}
        </div>

        {/* Terms agreement */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
            className="mt-0.5"
          />
          <label
            htmlFor="terms"
            className="text-sm text-[var(--muted-foreground)] cursor-pointer select-none leading-snug"
          >
            我已阅读并同意{" "}
            <Link href="/terms" target="_blank" className="text-[var(--primary)] hover:text-[var(--primary-hover)]">
              服务条款
            </Link>{" "}
            和{" "}
            <Link href="/privacy" target="_blank" className="text-[var(--primary)] hover:text-[var(--primary-hover)]">
              隐私政策
            </Link>
          </label>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting || !agreedToTerms}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              注册中...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              注册
            </>
          )}
        </Button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        已有账户?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          立即登录
        </Link>
      </p>
    </div>
  );
}
