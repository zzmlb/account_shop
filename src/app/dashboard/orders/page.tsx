"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Eye,
  Download,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OrderStatus = "all" | "pending" | "delivered" | "cancelled";

interface MockOrder {
  id: string;
  orderNo: string;
  product: string;
  quantity: number;
  amount: string;
  status: string;
  statusKey: OrderStatus;
  statusVariant: "default" | "success" | "secondary" | "destructive";
  paymentMethod: string;
  date: string;
}

const MOCK_ORDERS: MockOrder[] = [
  { id: "1", orderNo: "ORD-20260307-A1B2", product: "Gmail 全新账号", quantity: 2, amount: "¥11.98", status: "已完成", statusKey: "delivered", statusVariant: "success", paymentMethod: "余额支付", date: "2026-03-07 14:30" },
  { id: "2", orderNo: "ORD-20260306-C3D4", product: "Netflix 高级会员 1 个月", quantity: 1, amount: "¥15.99", status: "待支付", statusKey: "pending", statusVariant: "default", paymentMethod: "-", date: "2026-03-06 10:15" },
  { id: "3", orderNo: "ORD-20260305-E5F6", product: "ChatGPT Plus 共享账号", quantity: 1, amount: "¥19.99", status: "已完成", statusKey: "delivered", statusVariant: "success", paymentMethod: "支付宝", date: "2026-03-05 09:45" },
  { id: "4", orderNo: "ORD-20260304-G7H8", product: "NordVPN 2 年套餐", quantity: 1, amount: "¥59.99", status: "已取消", statusKey: "cancelled", statusVariant: "destructive", paymentMethod: "微信支付", date: "2026-03-04 16:20" },
  { id: "5", orderNo: "ORD-20260303-I9J0", product: "Spotify Premium 年卡", quantity: 1, amount: "¥39.99", status: "已完成", statusKey: "delivered", statusVariant: "success", paymentMethod: "余额支付", date: "2026-03-03 11:00" },
  { id: "6", orderNo: "ORD-20260302-K1L2", product: "Outlook 企业邮箱", quantity: 3, amount: "¥38.97", status: "已完成", statusKey: "delivered", statusVariant: "success", paymentMethod: "余额支付", date: "2026-03-02 08:30" },
  { id: "7", orderNo: "ORD-20260301-M3N4", product: "Steam 余额账号 $50", quantity: 1, amount: "¥199.00", status: "已取消", statusKey: "cancelled", statusVariant: "destructive", paymentMethod: "-", date: "2026-03-01 20:15" },
  { id: "8", orderNo: "ORD-20260228-P5Q6", product: "Adobe Creative Cloud 月卡", quantity: 1, amount: "¥49.99", status: "待支付", statusKey: "pending", statusVariant: "default", paymentMethod: "-", date: "2026-02-28 18:45" },
  { id: "9", orderNo: "ORD-20260227-R7S8", product: "Disney+ 年卡", quantity: 1, amount: "¥35.00", status: "已完成", statusKey: "delivered", statusVariant: "success", paymentMethod: "支付宝", date: "2026-02-27 12:00" },
  { id: "10", orderNo: "ORD-20260226-T9U0", product: "YouTube Premium 家庭版", quantity: 1, amount: "¥25.00", status: "已完成", statusKey: "delivered", statusVariant: "success", paymentMethod: "微信支付", date: "2026-02-26 09:30" },
];

const statusTabs = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待支付" },
  { value: "delivered", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

const PAGE_SIZE = 5;

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    return MOCK_ORDERS.filter((order) => {
      if (activeTab !== "all" && order.statusKey !== activeTab) return false;
      if (
        search &&
        !order.orderNo.toLowerCase().includes(search.toLowerCase()) &&
        !order.product.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  /* Reset page when filters change */
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setCurrentPage(1);
  };
  const handleSearch = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的订单</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            管理和查看您的所有订单
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          导出 CSV
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          {/* Date range hint */}
          <div className="hidden items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)] sm:flex">
            <Calendar className="h-3.5 w-3.5" />
            2026-02-01 ~ 2026-03-08
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              placeholder="搜索订单号或商品名..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Order list */}
      <div className="space-y-3">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 rounded-full bg-[var(--muted)] p-4">
              <ShoppingBag className="h-10 w-10 text-[var(--muted-foreground)]" />
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">暂无订单</p>
          </div>
        ) : (
          paginated.map((order) => (
            <div
              key={order.id}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] transition-colors hover:bg-[var(--card-hover)]"
            >
              {/* Header row */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-[var(--muted-foreground)]">
                    {order.orderNo}
                  </span>
                  <span className="hidden text-[var(--muted-foreground)] sm:inline">
                    {order.date}
                  </span>
                </div>
                <Badge variant={order.statusVariant}>{order.status}</Badge>
              </div>

              {/* Body row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10">
                    <ShoppingBag className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{order.product}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      x{order.quantity} &middot; {order.paymentMethod}
                      <span className="ml-2 sm:hidden">{order.date}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-lg font-bold">{order.amount}</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/order/${order.orderNo}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      查看详情
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-[var(--muted-foreground)]">
            共 {filtered.length} 条记录，第 {safeCurrentPage}/{totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
