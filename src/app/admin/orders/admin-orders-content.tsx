"use client";

import { useState } from "react";
import {
  Search,
  Download,
  MoreHorizontal,
  Eye,
  Truck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Package,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type OrderStatus = "PENDING" | "PAID" | "COMPLETED" | "CANCELLED" | "REFUNDED";

interface Order {
  id: string;
  orderNo: string;
  userName: string;
  userEmail: string;
  productName: string;
  amount: number;
  paymentMethod: string;
  status: OrderStatus;
  createdAt: string;
}

const mockOrders: Order[] = [
  {
    id: "1",
    orderNo: "ORD-20260305-A1B2",
    userName: "张伟",
    userEmail: "zhangwei@example.com",
    productName: "Adobe Photoshop 2026 永久授权",
    amount: 299.0,
    paymentMethod: "支付宝",
    status: "COMPLETED",
    createdAt: "2026-03-05 14:32:00",
  },
  {
    id: "2",
    orderNo: "ORD-20260305-C3D4",
    userName: "李娜",
    userEmail: "lina@example.com",
    productName: "Windows 11 Pro 密钥",
    amount: 158.0,
    paymentMethod: "微信支付",
    status: "PAID",
    createdAt: "2026-03-05 15:10:00",
  },
  {
    id: "3",
    orderNo: "ORD-20260304-E5F6",
    userName: "王磊",
    userEmail: "wanglei@example.com",
    productName: "Netflix 高级会员 年卡",
    amount: 688.0,
    paymentMethod: "余额支付",
    status: "PENDING",
    createdAt: "2026-03-04 09:22:00",
  },
  {
    id: "4",
    orderNo: "ORD-20260304-G7H8",
    userName: "赵敏",
    userEmail: "zhaomin@example.com",
    productName: "Spotify Premium 季卡",
    amount: 89.0,
    paymentMethod: "支付宝",
    status: "CANCELLED",
    createdAt: "2026-03-04 11:45:00",
  },
  {
    id: "5",
    orderNo: "ORD-20260303-I9J0",
    userName: "陈浩",
    userEmail: "chenhao@example.com",
    productName: "JetBrains 全家桶 年度订阅",
    amount: 1299.0,
    paymentMethod: "微信支付",
    status: "REFUNDED",
    createdAt: "2026-03-03 16:08:00",
  },
  {
    id: "6",
    orderNo: "ORD-20260303-K1L2",
    userName: "刘芳",
    userEmail: "liufang@example.com",
    productName: "Microsoft Office 365 家庭版",
    amount: 398.0,
    paymentMethod: "支付宝",
    status: "COMPLETED",
    createdAt: "2026-03-03 10:30:00",
  },
  {
    id: "7",
    orderNo: "ORD-20260302-M3N4",
    userName: "杨洋",
    userEmail: "yangyang@example.com",
    productName: "Steam 充值卡 200元",
    amount: 200.0,
    paymentMethod: "微信支付",
    status: "COMPLETED",
    createdAt: "2026-03-02 20:15:00",
  },
  {
    id: "8",
    orderNo: "ORD-20260302-O5P6",
    userName: "黄丽",
    userEmail: "huangli@example.com",
    productName: "Figma 专业版 月度订阅",
    amount: 128.0,
    paymentMethod: "余额支付",
    status: "PAID",
    createdAt: "2026-03-02 13:42:00",
  },
  {
    id: "9",
    orderNo: "ORD-20260301-Q7R8",
    userName: "周杰",
    userEmail: "zhoujie@example.com",
    productName: "ChatGPT Plus 月度会员",
    amount: 148.0,
    paymentMethod: "支付宝",
    status: "PENDING",
    createdAt: "2026-03-01 08:55:00",
  },
  {
    id: "10",
    orderNo: "ORD-20260301-S9T0",
    userName: "吴强",
    userEmail: "wuqiang@example.com",
    productName: "Notion 团队版 年度订阅",
    amount: 960.0,
    paymentMethod: "微信支付",
    status: "REFUNDED",
    createdAt: "2026-03-01 17:20:00",
  },
];

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success"; className?: string }
> = {
  PENDING: { label: "待支付", variant: "outline", className: "border-[var(--warning)] text-[var(--warning)]" },
  PAID: { label: "已支付", variant: "default" },
  COMPLETED: { label: "已完成", variant: "success" },
  CANCELLED: { label: "已取消", variant: "secondary" },
  REFUNDED: { label: "已退款", variant: "destructive" },
};

const statusTabs = [
  { value: "ALL", label: "全部" },
  { value: "PENDING", label: "待支付" },
  { value: "PAID", label: "已支付" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
  { value: "REFUNDED", label: "已退款" },
];


export default function AdminOrdersPageContent() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredOrders = mockOrders.filter((order) => {
    const matchesTab = activeTab === "ALL" || order.status === activeTab;
    const matchesSearch =
      !searchQuery ||
      order.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const getStatusCount = (status: string) => {
    if (status === "ALL") return mockOrders.length;
    return mockOrders.filter((o) => o.status === status).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            订单管理
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            管理和追踪所有平台订单
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          导出
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-auto flex-wrap">
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              {tab.label}
              <span className="ml-1 rounded-full bg-[var(--background)]/50 px-1.5 py-0.5 text-xs">
                {getStatusCount(tab.value)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索订单号或商品名称..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-[var(--muted-foreground)]">
          <CalendarDays className="h-4 w-4" />
          日期范围
        </Button>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    订单号
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    用户
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    商品
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    金额
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    支付方式
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    状态
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    时间
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Package className="h-10 w-10 mx-auto text-[var(--muted-foreground)] mb-3" />
                      <p className="text-sm text-[var(--muted-foreground)]">
                        暂无订单数据
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const status = statusConfig[order.status];
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono font-medium text-[var(--foreground)]">
                            {order.orderNo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              {order.userName}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {order.userEmail}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[var(--foreground)] max-w-[200px] truncate block">
                            {order.productName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-[var(--foreground)]">
                            ¥{order.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {order.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={status.variant} className={status.className}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                            {order.createdAt}
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
                              {order.status === "PAID" && (
                                <DropdownMenuItem className="gap-2 cursor-pointer">
                                  <Truck className="h-4 w-4" />
                                  手动发货
                                </DropdownMenuItem>
                              )}
                              {(order.status === "PAID" || order.status === "COMPLETED") && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="gap-2 cursor-pointer text-[var(--destructive)]">
                                    <RotateCcw className="h-4 w-4" />
                                    退款
                                  </DropdownMenuItem>
                                </>
                              )}
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
          {filteredOrders.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-[var(--muted-foreground)]">
                  共 {filteredOrders.length} 条订单，第 {currentPage}/{totalPages} 页
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
    </div>
  );
}
