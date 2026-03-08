"use client";

import { useState } from "react";
import {
  Bell,
  Send,
  Loader2,
  Users,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SendLog {
  id: number;
  title: string;
  count: number;
  time: string;
}

export default function BroadcastContent() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [href, setHref] = useState("");
  const [sending, setSending] = useState(false);
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);

  const handleSend = async () => {
    if (!title.trim()) {
      toast.error("请输入通知标题");
      return;
    }
    if (!content.trim()) {
      toast.error("请输入通知内容");
      return;
    }
    if (title.length > 200) {
      toast.error("标题不能超过200字");
      return;
    }
    if (content.length > 2000) {
      toast.error("内容不能超过2000字");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          href: href.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "发送成功");
        setSendLogs((prev) => [
          {
            id: Date.now(),
            title: title.trim(),
            count: data.count || 0,
            time: new Date().toLocaleString("zh-CN"),
          },
          ...prev,
        ]);
        setTitle("");
        setContent("");
        setHref("");
      } else {
        toast.error(data.message || "发送失败");
      }
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
          <Bell className="h-6 w-6 text-[var(--primary)]" />
          通知广播
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          向所有活跃用户发送系统通知，用户将在通知中心看到消息
        </p>
      </div>

      {/* Compose Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            编写通知
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="notif-title">
              通知标题 <span className="text-[var(--destructive)]">*</span>
            </Label>
            <Input
              id="notif-title"
              placeholder="例如：系统维护公告、新品上架通知"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              {title.length}/200
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notif-content">
              通知内容 <span className="text-[var(--destructive)]">*</span>
            </Label>
            <Textarea
              id="notif-content"
              placeholder="输入通知的详细内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={5}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              {content.length}/2000
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notif-href" className="flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" />
              跳转链接
              <span className="text-xs text-[var(--muted-foreground)]">（可选）</span>
            </Label>
            <Input
              id="notif-href"
              placeholder="例如：/products、/promotions"
              value={href}
              onChange={(e) => setHref(e.target.value)}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              用户点击通知后跳转的页面路径
            </p>
          </div>

          {/* Preview */}
          {(title || content) && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)]/50 p-4">
              <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">
                预览效果
              </p>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
                  <Bell className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {title || "通知标题"}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--muted-foreground)] whitespace-pre-line">
                    {content || "通知内容..."}
                  </p>
                  {href && (
                    <p className="mt-1 text-xs text-[var(--primary)]">
                      {href}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSend}
              disabled={sending || !title.trim() || !content.trim()}
              className="gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? "发送中..." : "发送给所有用户"}
            </Button>
            <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              将发送给所有活跃用户
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Send History (current session only) */}
      {sendLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
              本次发送记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sendLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--secondary)]/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {log.title}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {log.time}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 ml-3">
                    {log.count} 人
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="border-[var(--primary)]/20 bg-[var(--primary)]/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-[var(--primary)] mt-0.5" />
            <div className="text-sm text-[var(--muted-foreground)] space-y-1">
              <p className="font-medium text-[var(--foreground)]">使用提示</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>通知将发送给所有状态为「活跃」的用户</li>
                <li>用户可在「通知中心」查看收到的通知</li>
                <li>添加跳转链接可引导用户前往指定页面</li>
                <li>建议通知内容简洁明了，避免频繁发送以免打扰用户</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
