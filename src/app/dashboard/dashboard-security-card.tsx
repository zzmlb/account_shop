"use client";

import Link from "next/link";
import { Shield, CheckCircle2, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SecurityCardProps {
  email?: string | null;
  lastLoginInfo: { ip: string; time: string } | null;
}

export function DashboardSecurityCard({ email, lastLoginInfo }: SecurityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-[var(--success)]" />
          账户安全
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
            {email ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--warning)]" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">邮箱绑定</p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">
                {email || "未绑定邮箱"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            <div className="min-w-0">
              <p className="text-sm font-medium">登录密码</p>
              <p className="text-xs text-[var(--muted-foreground)]">已设置</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
            <Clock className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" />
            <div className="min-w-0">
              <p className="text-sm font-medium">上次登录</p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">
                {lastLoginInfo
                  ? `${lastLoginInfo.ip} · ${new Date(lastLoginInfo.time).toLocaleDateString("zh-CN")}`
                  : "无记录"}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/settings" className="gap-1 text-xs">
              管理安全设置
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
