"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MoreHorizontal,
  Eye,
  Wallet,
  Ban,
  ShieldCheck,
  Users,
  Loader2,
  Download,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { apiFetch, apiMutate } from "@/lib/api-fetch";
import { exportToCsv } from "@/lib/csv-export";
import ConfirmDialog from "@/components/shared/confirm-dialog";
import { AdminUsersSearchFilters } from "./admin-users-search-filters";
import { BalanceAdjustDialog } from "./balance-adjust-dialog";
import { UserDetailDialog } from "./user-detail-dialog";

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
  const [sortBy, setSortBy] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
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
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
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
      if (sortBy) {
        params.set("sortBy", sortBy);
      }
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const data = await apiFetch<{ users: ApiUser[]; pagination: Pagination }>(`/api/admin/users?${params.toString()}`);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "获取用户列表失败");
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, pageSize, roleFilter, statusFilter, sortBy, dateFrom, dateTo]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Toggle ban/unban
  const handleToggleBan = (user: ApiUser) => {
    const newStatus: UserStatus =
      user.status === "ACTIVE" ? "BANNED" : "ACTIVE";
    const actionLabel = newStatus === "BANNED" ? "封禁" : "解封";

    setConfirmAction({
      title: `${actionLabel}用户`,
      description: `确定要${actionLabel}用户「${user.username}」吗？`,
      onConfirm: () => doToggleBan(user, newStatus, actionLabel),
    });
  };

  const doToggleBan = async (user: ApiUser, newStatus: UserStatus, actionLabel: string) => {
    setConfirmAction(null);
    setActionLoading(user.id);
    try {
      await apiMutate(`/api/admin/users?id=${user.id}`, "PUT", { status: newStatus });
      toast.success(`已${actionLabel}用户 ${user.username}`);
      await fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${actionLabel}失败`);
    } finally {
      setActionLoading(null);
    }
  };

  // Open balance adjustment dialog
  const openBalanceDialog = (user: ApiUser) => {
    setSelectedUser(user);
    setBalanceDialogOpen(true);
  };

  // Clear selection when filters/page change
  useEffect(() => {
    setSelectedUsers(new Set());
  }, [currentPage, debouncedSearch, roleFilter, statusFilter, sortBy, dateFrom, dateTo]);

  const allSelected =
    users.length > 0 && users.every((u) => selectedUsers.has(u.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchStatus = (newStatus: "ACTIVE" | "BANNED") => {
    const ids = Array.from(selectedUsers);
    if (ids.length === 0) return;
    const actionLabel = newStatus === "BANNED" ? "封禁" : "解封";

    setConfirmAction({
      title: `批量${actionLabel}`,
      description: `确定要批量${actionLabel} ${ids.length} 个用户吗？`,
      onConfirm: () => doBatchStatus(ids, newStatus, actionLabel),
    });
  };

  const doBatchStatus = async (ids: string[], newStatus: "ACTIVE" | "BANNED", actionLabel: string) => {
    setConfirmAction(null);
    setBatchLoading(true);
    try {
      const data = await apiMutate<{ message: string }>("/api/admin/users", "PATCH", { ids, status: newStatus });
      toast.success(data.message);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `批量${actionLabel}失败`);
    } finally {
      setBatchLoading(false);
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
      <AdminUsersSearchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        roleFilter={roleFilter}
        onRoleFilterChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
        sortBy={sortBy}
        onSortByChange={(v) => { setSortBy(v); setCurrentPage(1); }}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(v) => { setDateFrom(v); setCurrentPage(1); }}
        onDateToChange={(v) => { setDateTo(v); setCurrentPage(1); }}
      />

      {/* Bulk action bar */}
      {selectedUsers.size > 0 && (
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-[var(--primary)]" />
          <span className="text-sm">
            已选择 <strong>{selectedUsers.size}</strong> 个用户
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => handleBatchStatus("BANNED")}
              disabled={batchLoading}
            >
              {batchLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              批量封禁
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => handleBatchStatus("ACTIVE")}
              disabled={batchLoading}
            >
              {batchLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              批量解封
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedUsers(new Set())}
            >
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="用户管理列表">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th scope="col" className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected && users.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-[var(--input)] accent-[var(--primary)] cursor-pointer"
                      aria-label="全选"
                    />
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    用户名
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    邮箱
                  </th>
                  <th scope="col" className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    余额
                  </th>
                  <th scope="col" className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    订单数
                  </th>
                  <th scope="col" className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    消费总额
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    角色
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    状态
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    注册时间
                  </th>
                  <th scope="col" className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-[var(--border)]">
                      <td className="px-3 py-3"><div className="h-4 w-4 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-12 rounded-full bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-16 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-14 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-14 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3 text-right"><div className="ml-auto h-8 w-8 rounded bg-[var(--muted)]" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12">
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
                    const isSelected = selectedUsers.has(user.id);
                    return (
                      <tr
                        key={user.id}
                        className={cn(
                          "border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors",
                          isSelected && "bg-[var(--primary)]/5"
                        )}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectUser(user.id)}
                            className="h-4 w-4 rounded border-[var(--input)] accent-[var(--primary)] cursor-pointer"
                            aria-label={`选择用户 ${user.username}`}
                          />
                        </td>
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
                                aria-label="用户操作"
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
      <BalanceAdjustDialog
        user={selectedUser}
        open={balanceDialogOpen}
        onOpenChange={setBalanceDialogOpen}
        onSuccess={fetchUsers}
      />

      {/* User Detail Dialog */}
      <UserDetailDialog
        user={detailUser}
        onClose={() => setDetailUser(null)}
        onAdjustBalance={openBalanceDialog}
        onToggleBan={handleToggleBan}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.title ?? ""}
        description={confirmAction?.description ?? ""}
        confirmLabel="确认"
        variant="destructive"
        onConfirm={() => confirmAction?.onConfirm()}
      />
    </div>
  );
}
