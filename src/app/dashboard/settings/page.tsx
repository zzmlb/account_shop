"use client";

import { useState } from "react";
import {
  Lock,
  User,
  Camera,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Bell,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface FormMessage {
  type: "success" | "error";
  text: string;
}

export default function SettingsPage() {
  const { user } = useAuthStore();

  /* ---- Password form state ---- */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<FormMessage | null>(
    null
  );

  /* ---- Notification preferences ---- */
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [promoEmails, setPromoEmails] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  /* ---- Avatar state ---- */
  const [avatarHover, setAvatarHover] = useState(false);

  /* ---- Password strength ---- */
  const getPasswordStrength = (
    pw: string
  ): { level: number; label: string; color: string } => {
    if (pw.length === 0) return { level: 0, label: "", color: "" };
    if (pw.length < 6)
      return { level: 1, label: "弱", color: "bg-[var(--destructive)]" };
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(
      Boolean
    ).length;
    if (pw.length >= 8 && score >= 3)
      return { level: 3, label: "强", color: "bg-[var(--success)]" };
    if (pw.length >= 6 && score >= 2)
      return { level: 2, label: "中", color: "bg-[var(--warning)]" };
    return { level: 1, label: "弱", color: "bg-[var(--destructive)]" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  /* ---- Handlers ---- */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: "error", text: "请输入当前密码" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "新密码至少需要6个字符" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "两次输入的密码不一致" });
      return;
    }

    setPasswordSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setPasswordSaving(false);
    setPasswordMessage({ type: "success", text: "密码修改成功" });
    toast.success("密码已更新");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleNotifSave = async () => {
    setNotifSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setNotifSaving(false);
    toast.success("通知偏好已保存");
  };

  const displayEmail = user?.email ?? "user@example.com";
  const displayUsername = user?.username ?? "user";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          账户设置
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          管理您的个人信息和安全设置
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== Left column: Personal Info ===== */}
        <div className="space-y-6 lg:col-span-1">
          {/* Avatar card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-[var(--primary)]" />
                个人信息
              </CardTitle>
              <CardDescription>您的账户基本信息</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {/* Avatar placeholder */}
              <button
                className="group relative mb-4"
                onMouseEnter={() => setAvatarHover(true)}
                onMouseLeave={() => setAvatarHover(false)}
                onClick={() => {
                  toast.info("头像上传功能开发中");
                }}
              >
                <div
                  className={cn(
                    "flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed transition-all",
                    avatarHover
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--border)] bg-[var(--muted)]"
                  )}
                >
                  <User
                    className={cn(
                      "h-12 w-12 transition-colors",
                      avatarHover
                        ? "text-[var(--primary)]"
                        : "text-[var(--muted-foreground)]"
                    )}
                  />
                </div>
                {/* Camera overlay */}
                <div
                  className={cn(
                    "absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--card)] shadow-sm transition-all",
                    avatarHover
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "bg-[var(--secondary)] text-[var(--secondary-foreground)]"
                  )}
                >
                  <Camera className="h-3.5 w-3.5" />
                </div>
              </button>

              {/* User info */}
              <p className="text-sm font-medium text-[var(--foreground)]">
                {displayUsername}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {displayEmail}
              </p>
              <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
                支持 JPG、PNG 格式
                <br />
                建议尺寸 200x200 像素
              </p>

              <Separator className="my-4 w-full" />

              {/* Read-only fields */}
              <div className="w-full space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[var(--muted-foreground)]">
                    用户名
                  </Label>
                  <div className="flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--muted)]/50 px-3 text-sm text-[var(--muted-foreground)]">
                    {displayUsername}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[var(--muted-foreground)]">
                    邮箱
                  </Label>
                  <div className="flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--muted)]/50 px-3 text-sm text-[var(--muted-foreground)]">
                    {displayEmail}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== Right column: Security + Notifications ===== */}
        <div className="space-y-6 lg:col-span-2">
          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-[var(--primary)]" />
                安全设置
              </CardTitle>
              <CardDescription>
                定期修改密码有助于保护您的账户安全
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* Current password */}
                <div className="space-y-2">
                  <Label htmlFor="current-password">当前密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      id="current-password"
                      type={showCurrentPw ? "text" : "password"}
                      placeholder="输入当前密码"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      {showCurrentPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password">新密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      id="new-password"
                      type={showNewPw ? "text" : "password"}
                      placeholder="输入新密码（至少6位）"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      {showNewPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {/* Password strength bar */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors",
                              passwordStrength.level >= level
                                ? passwordStrength.color
                                : "bg-[var(--muted)]"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        密码强度: {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm new password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">确认新密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPw ? "text" : "password"}
                      placeholder="再次输入新密码"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn(
                        "pl-10 pr-10",
                        confirmPassword.length > 0 &&
                          confirmPassword !== newPassword &&
                          "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      {showConfirmPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword.length > 0 &&
                    confirmPassword !== newPassword && (
                      <p className="text-xs text-[var(--destructive)]">
                        两次输入的密码不一致
                      </p>
                    )}
                </div>

                {/* Message */}
                {passwordMessage && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm",
                      passwordMessage.type === "success"
                        ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                    )}
                  >
                    {passwordMessage.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {passwordMessage.text}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={passwordSaving}
                  className="gap-2"
                >
                  {passwordSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      修改密码
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-[var(--primary)]" />
                通知偏好
              </CardTitle>
              <CardDescription>
                选择您希望接收的通知类型
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Order notifications */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="order-notif"
                    className="text-sm font-medium cursor-pointer"
                  >
                    订单通知
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    订单状态变更、发货提醒、卡密到账通知
                  </p>
                </div>
                <Checkbox
                  id="order-notif"
                  checked={orderNotifications}
                  onCheckedChange={(checked) =>
                    setOrderNotifications(checked as boolean)
                  }
                />
              </div>

              <Separator />

              {/* Promotional emails */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="promo-email"
                    className="text-sm font-medium cursor-pointer"
                  >
                    促销邮件
                  </Label>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    新品上架、限时折扣、优惠券发放等促销信息
                  </p>
                </div>
                <Checkbox
                  id="promo-email"
                  checked={promoEmails}
                  onCheckedChange={(checked) =>
                    setPromoEmails(checked as boolean)
                  }
                />
              </div>

              <Button
                onClick={handleNotifSave}
                disabled={notifSaving}
                className="gap-2"
              >
                {notifSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    保存
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
