"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth-store";
import { apiMutate } from "@/lib/api-fetch";

export function DeleteAccountSection() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error("请输入 DELETE 确认删除");
      return;
    }
    if (!password) {
      toast.error("请输入密码确认");
      return;
    }
    setDeleting(true);
    try {
      await apiMutate("/api/auth/delete-account", "POST", { password });
      toast.success("账户已删除");
      logout();
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-[var(--destructive)]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-[var(--destructive)]">
            <Trash2 className="h-5 w-5" />
            危险操作
          </CardTitle>
          <CardDescription>
            删除账户后，所有个人数据将被清除，此操作不可恢复
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            删除账户
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[var(--destructive)]">
              确认删除账户
            </DialogTitle>
            <DialogDescription>
              此操作不可恢复。您的个人信息将被清除，但订单记录会保留。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>输入密码确认身份</Label>
              <Input
                type="password"
                placeholder="请输入当前密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>
                输入 <span className="font-mono font-bold">DELETE</span> 确认
              </Label>
              <Input
                placeholder="输入 DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                maxLength={6}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setPassword("");
                setConfirmText("");
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleting || confirmText !== "DELETE" || !password}
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
