"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-[var(--destructive)]/10 p-4">
          <AlertCircle className="h-8 w-8 text-[var(--destructive)]" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
          无效的重置链接
        </h2>
        <p className="mb-6 text-sm text-[var(--muted-foreground)]">
          此链接无效或已过期，请重新申请密码重置
        </p>
        <Button asChild>
          <Link href="/forgot-password">重新申请</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-[var(--success)]/10 p-4">
          <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
          密码重置成功
        </h2>
        <p className="mb-6 text-sm text-[var(--muted-foreground)]">
          您的密码已更新，请使用新密码登录
        </p>
        <Button onClick={() => router.push("/login")}>去登录</Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("密码长度至少为6位");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || "重置失败，请重试");
        toast.error(data.message || "重置失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10">
          <KeyRound className="h-7 w-7 text-[var(--primary)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          设置新密码
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          请输入您的新密码
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            新密码
          </label>
          <Input
            type="password"
            placeholder="至少6位字符"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            确认密码
          </label>
          <Input
            type="password"
            placeholder="再次输入新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--destructive)]">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              提交中...
            </>
          ) : (
            "重置密码"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        记起密码了？{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
        >
          返回登录
        </Link>
      </p>
    </div>
  );
}
