"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import AnimatedSection from "@/components/shared/animated-section";

const FAQ_ITEMS = [
  {
    q: "购买后多久可以收到商品？",
    a: "大部分数字商品在支付成功后即时自动发货，卡密信息将通过邮件发送并显示在订单详情页。如遇延迟，通常不超过5分钟。",
  },
  {
    q: "支持哪些支付方式？",
    a: "目前支持支付宝、微信支付和账户余额支付。所有支付通道均通过加密传输，确保资金安全。",
  },
  {
    q: "购买的商品有售后保障吗？",
    a: "所有商品均提供售后保障期，具体时长见商品详情页。保障期内如遇问题可提交退款申请，管理员审核后将及时处理。",
  },
  {
    q: "如何查看已购买的卡密/账号信息？",
    a: "登录账户后进入「我的订单」，找到对应订单展开即可查看卡密信息。同时您注册时填写的邮箱也会收到发货通知邮件。",
  },
  {
    q: "不注册账户可以购买吗？",
    a: "目前需要注册账户才能购买商品，注册过程仅需用户名和邮箱，方便您管理订单和享受售后服务。",
  },
  {
    q: "账户余额如何使用？",
    a: "账户余额可直接用于购买商品。管理员可为您充值余额，退款金额也会返还至账户余额。",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <AnimatedSection className="mb-10 text-center">
        <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          常见问题
        </h2>
        <p className="mt-3 text-[var(--muted-foreground)]">
          快速了解平台使用方式
        </p>
      </AnimatedSection>

      <div className="mx-auto max-w-3xl space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] transition-colors"
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
              aria-expanded={openIndex === i}
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              <span className="flex-1 text-sm font-medium text-[var(--foreground)]">
                {item.q}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200",
                  openIndex === i && "rotate-180"
                )}
              />
            </button>
            {openIndex === i && (
              <div className="border-t border-[var(--border)] px-5 py-4">
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {item.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/articles"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          查看更多帮助文章
        </Link>
      </div>
    </section>
  );
}
