"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  MoreHorizontal,
  Eye,
  Wallet,
  Ban,
  ShieldCheck,
  Users,
  Loader2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/csv-export";

type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
type UserStatus = "ACTIVE" | "BANNED";

interface ApiUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  balance: number;
  role: UserRole;
  status: UserStatus;
  orderCount: number;
  totalSpent: number;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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

export default function AdminUsersPageContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 5,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<ApiUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const pageSize = 5;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (roleFilter) {
        params.set("role", roleFilter);
      }
      if (statusFilter) {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        toast.error("获取用户列表失败");
      }
    } catch {
      toast.error("网络错误，获取用户列表失败");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, pageSize, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Toggle ban/unban
  const handleToggleBan = async (user: ApiUser) => {
    const newStatus: UserStatus =
      user.status === "ACTIVE" ? "BANNED" : "ACTIVE";
    const actionLabel = newStatus === "BANNED" ? "封禁" : "解封";

    if (!window.confirm(`确定要${actionLabel}用户「${user.username}」吗？`)) return;

    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`已${actionLabel}用户 ${user.username}`);
        await fetchUsers();
      } else {
        toast.error(data.error || `${actionLabel}失败`);
      }
    } catch {
      toast.error(`网络错误，${actionLabel}失败`);
    } finally {
      setActionLoading(null);
    }
  };

  // Open balance adjustment dialog
  const openBalanceDialog = (user: ApiUser) => {
    setSelectedUser(user);
    setAdjustAmount("");
    setAdjustReason("");
    setBalanceDialogOpen(true);
  };

  // Submit balance adjustment
  const handleBalanceAdjust = async () => {
    if (!selectedUser || !adjustAmount) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount)) return;

    setActionLoading(selectedUser.id);
    try {
      const res = await fetch(`/api/admin/users?id=${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balanceAdjust: amount }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          `已调整用户 ${selectedUser.username} 的余额：${amount >= 0 ? "+" : ""}${amount.toFixed(2)}`
        );
        setBalanceDialogOpen(false);
        setSelectedUser(null);
        setAdjustAmount("");
        setAdjustReason("");
        await fetchUsers();
      } else {
        toast.error(data.error || "余额调整失败");
      }
    } catch {
      toast.error("网络错误，余额调整失败");
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = pagination.totalPages;
  const totalUsers = pagination.total;

  // Count active/banned from current knowledge (total from API)
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const bannedCount = users.filter((u) => u.status === "BANNED").length;

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            用户管理
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            共 {totalUsers} 名注册用户
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Users className="h-4 w-4" />
            活跃 {activeCount} / 封禁 {bannedCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (users.length === 0) {
                toast.error("没有可导出的用户数据");
                return;
              }
              exportToCsv(
                `users_${new Date().toISOString().slice(0, 10)}`,
                [
                  { header: "用户名", accessor: (u: ApiUser) => u.username },
                  { header: "邮箱", accessor: (u: ApiUser) => u.email },
                  { header: "角色", accessor: (u: ApiUser) => roleConfig[u.role].label },
                  { header: "状态", accessor: (u: ApiUser) => u.status === "ACTIVE" ? "正常" : "封禁" },
                  { header: "余额", accessor: (u: ApiUser) => u.balance },
                  { header: "订单数", accessor: (u: ApiUser) => u.orderCount },
                  { header: "消费总额", accessor: (u: ApiUser) => (u.totalSpent ?? 0).toFixed(2) },
                  { header: "最后登录", accessor: (u: ApiUser) => u.lastLoginAt ? formatDate(u.lastLoginAt) : "-" },
                  { header: "注册时间", accessor: (u: ApiUser) => formatDate(u.createdAt) },
                ],
                users
              );
              toast.success(`已导出 ${users.length} 名用户`);
            }}
          >
            <Download className="h-4 w-4" />
            导出
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索用户名或邮箱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
        >
          <option value="">全部角色</option>
          <option value="USER">用户</option>
          <option value="ADMIN">管理员</option>
          <option value="SUPER_ADMIN">超级管理员</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
        >
          <option value="">全部状态</option>
          <option value="ACTIVE">正常</option>
          <option value="BANNED">已封禁</option>
        </select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="用户管理列表">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    用户名
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    邮箱
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    余额
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    订单数
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    消费总额
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    角色
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    状态
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    注册时间
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-[var(--border)]">
                      <td className="px-4 py-3"><div className="h-4 w-8 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-12 rounded-full bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3 text-right"><div className="ml-auto h-8 w-8 rounded bg-[var(--muted)]" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <Users className="h-10 w-10 mx-auto text-[var(--muted-foreground)] mb-3" />
                      <p className="text-sm text-[var(--muted-foreground)]">
                        暂无用户数据
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const role = roleConfig[user.role];
                    const isActionLoading = actionLoading === user.id;
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            {user.username}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {user.email}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-[var(--foreground)]">
                            ¥{Number(user.balance).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {user.orderCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="text-sm text-[var(--foreground)]">
                            ¥{(user.totalSpent ?? 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={role.variant} className={role.className}>
                            {role.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {user.status === "ACTIVE" ? (
                            <Badge variant="success">正常</Badge>
                          ) : (
                            <Badge variant="destructive">已封禁</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                            {formatDate(user.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 sm:h-8 sm:w-8"
                                disabled={isActionLoading}
                              >
                                {isActionLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => setDetailUser(user)}
                              >
                                <Eye className="h-4 w-4" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => openBalanceDialog(user)}
                              >
                                <Wallet className="h-4 w-4" />
                                调整余额
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={cn(
                                  "gap-2 cursor-pointer",
                                  user.status === "ACTIVE"
                                    ? "text-[var(--destructive)]"
                                    : "text-[var(--success)]"
                                )}
                                onClick={() => handleToggleBan(user)}
                              >
                                {user.status === "ACTIVE" ? (
                                  <>
                                    <Ban className="h-4 w-4" />
                                    封禁
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="h-4 w-4" />
                                    解封
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && users.length > 0 && (
            <>
              <Separator />
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                total={totalUsers}
                onPageChange={setCurrentPage}
                showPageNumbers
                totalLabel="名用户"
                className="px-4 py-3"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Balance Adjustment Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调整余额</DialogTitle>
            <DialogDescription>
              为用户{" "}
              <span className="font-medium text-[var(--foreground)]">
                {selectedUser?.username}
              </span>{" "}
              调整账户余额。 当前余额：¥
              {selectedUser ? Number(selectedUser.balance).toFixed(2) : "0.00"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="adjust-amount">调整金额</Label>
              <Input
                id="adjust-amount"
                type="number"
                step="0.01"
                placeholder="正数为充值，负数为扣除"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                输入正数增加余额，输入负数扣减余额
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-reason">调整原因</Label>
              <Input
                id="adjust-reason"
                placeholder="请输入调整原因..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
            {adjustAmount &&
              !isNaN(parseFloat(adjustAmount)) &&
              selectedUser && (
                <div className="rounded-[var(--radius-md)] bg-[var(--muted)] p-3">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    调整后余额：
                    <span className="font-semibold text-[var(--foreground)] ml-1">
                      ¥
                      {Math.max(
                        0,
                        Number(selectedUser.balance) + parseFloat(adjustAmount)
                      ).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBalanceDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleBalanceAdjust}
              disabled={
                !adjustAmount ||
                isNaN(parseFloat(adjustAmount)) ||
                actionLoading !== null
              }
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认调整"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
            <DialogDescription>
              查看用户的详细信息
            </DialogDescription>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[var(--muted-foreground)]">用户名</p>
                  <p className="font-medium text-[var(--foreground)]">{detailUser.username}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">角色</p>
                  <Badge variant={roleConfig[detailUser.role].variant as "default" | "secondary" | "destructive" | "outline"} className={roleConfig[detailUser.role].className}>
                    {roleConfig[detailUser.role].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">邮箱</p>
                  <p className="font-medium text-[var(--foreground)] break-all">{detailUser.email}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">状态</p>
                  <Badge variant={detailUser.status === "ACTIVE" ? "outline" : "destructive"}>
                    {detailUser.status === "ACTIVE" ? "正常" : "已封禁"}
                  </Badge>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">余额</p>
                  <p className="font-semibold text-[var(--primary)]">¥{Number(detailUser.balance).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">订单数</p>
                  <p className="font-medium text-[var(--foreground)]">{detailUser.orderCount}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">消费总额</p>
                  <p className="font-semibold text-[var(--foreground)]">¥{(detailUser.totalSpent ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">最后登录</p>
                  <p className="font-medium text-[var(--foreground)]">{detailUser.lastLoginAt ? new Date(detailUser.lastLoginAt).toLocaleDateString("zh-CN") : "从未登录"}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">注册时间</p>
                  <p className="font-medium text-[var(--foreground)]">{new Date(detailUser.createdAt).toLocaleDateString("zh-CN")}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">用户ID</p>
                  <p className="font-mono text-xs text-[var(--muted-foreground)] break-all">{detailUser.id}</p>
                </div>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="default" size="sm" className="gap-1.5">
                  <Link href={`/admin/users/${detailUser.id}`}>
                    <Eye className="h-3.5 w-3.5" />
                    查看详细资料
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailUser(null);
                    openBalanceDialog(detailUser);
                  }}
                  className="gap-1.5"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  调整余额
                </Button>
                <Button
                  variant={detailUser.status === "ACTIVE" ? "destructive" : "default"}
                  size="sm"
                  onClick={() => {
                    setDetailUser(null);
                    handleToggleBan(detailUser);
                  }}
                  className="gap-1.5"
                >
                  {detailUser.status === "ACTIVE" ? (
                    <><Ban className="h-3.5 w-3.5" />封禁</>
                  ) : (
                    <><ShieldCheck className="h-3.5 w-3.5" />解封</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
