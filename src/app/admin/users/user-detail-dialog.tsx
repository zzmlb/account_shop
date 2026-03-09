"use client";

import Link from "next/link";
import { Eye, Wallet, Ban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

interface DetailUser {
  id: string;
  username: string;
  email: string;
  balance: number;
  role: UserRole;
  status: "ACTIVE" | "BANNED";
  orderCount: number;
  totalSpent: number;
  lastLoginAt: string | null;
  createdAt: string;
}

const roleConfig: Record<
  UserRole,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline" | "success";
    className?: string;
  }
> = {
  USER: { label: "用户", variant: "secondary" },
  ADMIN: { label: "管理员", variant: "default" },
  SUPER_ADMIN: {
    label: "超级管理员",
    variant: "outline",
    className: "border-[var(--accent)] text-[var(--accent)]",
  },
};

interface UserDetailDialogProps {
  user: DetailUser | null;
  onClose: () => void;
  onAdjustBalance: (user: DetailUser) => void;
  onToggleBan: (user: DetailUser) => void;
}

export function UserDetailDialog({
  user,
  onClose,
  onAdjustBalance,
  onToggleBan,
}: UserDetailDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>用户详情</DialogTitle>
          <DialogDescription>查看用户的详细信息</DialogDescription>
        </DialogHeader>
        {user && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[var(--muted-foreground)]">用户名</p>
                <p className="font-medium text-[var(--foreground)]">
                  {user.username}
                </p>
              </div>
              <div>
                <p className="text-[var(--muted-foreground)]">角色</p>
                <Badge
                  variant={
                    roleConfig[user.role].variant as
                      | "default"
                      | "secondary"
                      | "destructive"
                      | "outline"
                  }
                  className={roleConfig[user.role].className}
                >
                  {roleConfig[user.role].label}
                </Badge>
              </div>
              <div>
                <p className="text-[var(--muted-foreground)]">邮箱</p>
                <p className="font-medium text-[var(--foreground)] break-all">
                  {user.email}
                </p>
              </div>
              <div>
                <p className="text-[var(--muted-foreground)]">状态</p>
                <Badge
                  variant={
                    user.status === "ACTIVE" ? "outline" : "destructive"
                  }
                >
                  {user.status === "ACTIVE" ? "正常" : "已封禁"}
                </Badge>
              </div>
              <div>
                <p className="text-[var(--muted-foreground)]">余额</p>
                <p className="font-semibold text-[var(--primary)]">
                  ¥{Number(user.balance).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[var(--muted-foreground)]">订单数</p>
                <p className="font-medium text-[var(--foreground)]">
                  {user.orderCount}
                </p>
              </div>
              <div>
                <p className="text-[var(--muted-foreground)]">消费总额</p>
                <p className="font-semibold text-[var(--foreground)]">
                  ¥{(user.totalSpent ?? 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[var(--muted-foreground)]">最后登录</p>
                <p className="font-medium text-[var(--foreground)]">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString("zh-CN")
                    : "从未登录"}
                </p>
              </div>
              <div>
                <p className="text-[var(--muted-foreground)]">注册时间</p>
                <p className="font-medium text-[var(--foreground)]">
                  {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <div>
                <p className="text-[var(--muted-foreground)]">用户ID</p>
                <p className="font-mono text-xs text-[var(--muted-foreground)] break-all">
                  {user.id}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="default"
                size="sm"
                className="gap-1.5"
              >
                <Link href={`/admin/users/${user.id}`}>
                  <Eye className="h-3.5 w-3.5" />
                  查看详细资料
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onAdjustBalance(user);
                }}
                className="gap-1.5"
              >
                <Wallet className="h-3.5 w-3.5" />
                调整余额
              </Button>
              <Button
                variant={
                  user.status === "ACTIVE" ? "destructive" : "default"
                }
                size="sm"
                onClick={() => {
                  onClose();
                  onToggleBan(user);
                }}
                className="gap-1.5"
              >
                {user.status === "ACTIVE" ? (
                  <>
                    <Ban className="h-3.5 w-3.5" />
                    封禁
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    解封
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
