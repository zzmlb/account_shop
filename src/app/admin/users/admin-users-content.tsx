"use client";

import { useState } from "react";
import {
  Search,
  MoreHorizontal,
  Eye,
  Wallet,
  Ban,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
type UserStatus = "ACTIVE" | "BANNED";

interface MockUser {
  id: string;
  username: string;
  email: string;
  balance: number;
  orderCount: number;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

const mockUsers: MockUser[] = [
  {
    id: "1",
    username: "张伟",
    email: "zhangwei@example.com",
    balance: 1280.5,
    orderCount: 12,
    role: "USER",
    status: "ACTIVE",
    createdAt: "2025-11-05",
  },
  {
    id: "2",
    username: "李娜",
    email: "lina@example.com",
    balance: 350.0,
    orderCount: 5,
    role: "USER",
    status: "ACTIVE",
    createdAt: "2025-12-10",
  },
  {
    id: "3",
    username: "王磊",
    email: "wanglei@example.com",
    balance: 0.0,
    orderCount: 2,
    role: "USER",
    status: "BANNED",
    createdAt: "2026-01-03",
  },
  {
    id: "4",
    username: "赵敏",
    email: "zhaomin@example.com",
    balance: 5600.0,
    orderCount: 28,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2025-09-20",
  },
  {
    id: "5",
    username: "陈浩",
    email: "chenhao@example.com",
    balance: 720.3,
    orderCount: 8,
    role: "USER",
    status: "ACTIVE",
    createdAt: "2026-01-15",
  },
  {
    id: "6",
    username: "刘芳",
    email: "liufang@example.com",
    balance: 99.0,
    orderCount: 1,
    role: "USER",
    status: "ACTIVE",
    createdAt: "2026-02-08",
  },
  {
    id: "7",
    username: "杨洋",
    email: "yangyang@example.com",
    balance: 15200.0,
    orderCount: 45,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    createdAt: "2025-08-01",
  },
  {
    id: "8",
    username: "黄丽",
    email: "huangli@example.com",
    balance: 430.0,
    orderCount: 6,
    role: "USER",
    status: "BANNED",
    createdAt: "2025-12-22",
  },
  {
    id: "9",
    username: "周杰",
    email: "zhoujie@example.com",
    balance: 2100.0,
    orderCount: 15,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2025-10-18",
  },
  {
    id: "10",
    username: "吴强",
    email: "wuqiang@example.com",
    balance: 88.8,
    orderCount: 3,
    role: "USER",
    status: "ACTIVE",
    createdAt: "2026-02-28",
  },
];

const roleConfig: Record<UserRole, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success"; className?: string }> = {
  USER: { label: "USER", variant: "secondary" },
  ADMIN: { label: "ADMIN", variant: "default" },
  SUPER_ADMIN: { label: "SUPER_ADMIN", variant: "outline", className: "border-[var(--accent)] text-[var(--accent)]" },
};


export default function AdminUsersPageContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<MockUser[]>(mockUsers);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const pageSize = 5;

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      !searchQuery ||
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleToggleBan = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === "ACTIVE" ? "BANNED" as UserStatus : "ACTIVE" as UserStatus }
          : u
      )
    );
  };

  const openBalanceDialog = (user: MockUser) => {
    setSelectedUser(user);
    setAdjustAmount("");
    setAdjustReason("");
    setBalanceDialogOpen(true);
  };

  const handleBalanceAdjust = () => {
    if (!selectedUser || !adjustAmount) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount)) return;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? { ...u, balance: Math.max(0, u.balance + amount) }
          : u
      )
    );
    setBalanceDialogOpen(false);
    setSelectedUser(null);
    setAdjustAmount("");
    setAdjustReason("");
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
            共 {users.length} 名注册用户
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Users className="h-4 w-4" />
          活跃 {users.filter((u) => u.status === "ACTIVE").length} / 封禁{" "}
          {users.filter((u) => u.status === "BANNED").length}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input
          placeholder="搜索用户名或邮箱..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
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
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Users className="h-10 w-10 mx-auto text-[var(--muted-foreground)] mb-3" />
                      <p className="text-sm text-[var(--muted-foreground)]">
                        暂无用户数据
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const role = roleConfig[user.role];
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
                            ¥{user.balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {user.orderCount}
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
                            {user.createdAt}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2 cursor-pointer">
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
                                onClick={() => handleToggleBan(user.id)}
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
          {filteredUsers.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-[var(--muted-foreground)]">
                  共 {filteredUsers.length} 名用户，第 {currentPage}/{totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="gap-1"
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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
              为用户 <span className="font-medium text-[var(--foreground)]">{selectedUser?.username}</span> 调整账户余额。
              当前余额：¥{selectedUser?.balance.toFixed(2)}
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
            {adjustAmount && !isNaN(parseFloat(adjustAmount)) && selectedUser && (
              <div className="rounded-[var(--radius-md)] bg-[var(--muted)] p-3">
                <p className="text-sm text-[var(--muted-foreground)]">
                  调整后余额：
                  <span className="font-semibold text-[var(--foreground)] ml-1">
                    ¥{Math.max(0, selectedUser.balance + parseFloat(adjustAmount)).toFixed(2)}
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
              disabled={!adjustAmount || isNaN(parseFloat(adjustAmount))}
            >
              确认调整
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
