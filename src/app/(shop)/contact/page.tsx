import type { Metadata } from "next";
import { Mail, MessageSquare, Clock, Shield } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "联系我们",
  description: `联系 ${SITE_NAME} 客服团队，获取帮助与支持`,
  openGraph: {
    title: `联系我们 - ${SITE_NAME}`,
    description: `联系 ${SITE_NAME} 客服团队，获取帮助与支持`,
    url: `${SITE_URL}/contact`,
  },
  alternates: { canonical: `${SITE_URL}/contact` },
};

const contactMethods = [
  {
    icon: Mail,
    title: "邮件支持",
    description: "发送邮件至我们的客服邮箱，我们会在24小时内回复。",
    action: "support@pj37.com",
    actionLabel: "发送邮件",
    href: "mailto:support@pj37.com",
  },
  {
    icon: MessageSquare,
    title: "在线客服",
    description: "工作时间内可通过在线客服即时沟通，获得实时帮助。",
    action: "9:00 - 22:00",
    actionLabel: "在线时间",
    href: null,
  },
];

const faqItems = [
  {
    q: "购买后多久能收到卡密？",
    a: "使用余额支付后，系统会自动秒级发货，卡密将在订单详情页显示，同时发送至您的邮箱。",
  },
  {
    q: "卡密无法使用怎么办？",
    a: "请在购买后24小时内联系客服，提供订单号和问题描述，我们会尽快为您处理。",
  },
  {
    q: "可以申请退款吗？",
    a: "数字商品一经发货，原则上不支持退款。如存在质量问题（如卡密无效），请联系客服协商处理。",
  },
  {
    q: "如何充值账户余额？",
    a: "登录后前往「个人中心 > 余额管理」页面，选择充值金额并通过支付宝或微信完成充值。",
  },
  {
    q: "忘记密码怎么办？",
    a: "在登录页面点击「忘记密码」，输入注册邮箱，系统将发送密码重置链接至您的邮箱。",
  },
  {
    q: "如何查看已购买的卡密？",
    a: "登录后前往「个人中心 > 我的订单」，找到对应订单，点击查看即可看到卡密信息。也可查看购买时发送的邮件。",
  },
];

export default function ContactPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
          联系我们
        </h1>
        <p className="mt-3 text-lg text-[var(--muted-foreground)]">
          遇到问题？我们随时准备为您提供帮助
        </p>
      </div>

      {/* Contact methods */}
      <div className="mb-16 grid gap-6 sm:grid-cols-2">
        {contactMethods.map((method) => (
          <div
            key={method.title}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10">
              <method.icon className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">
              {method.title}
            </h3>
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              {method.description}
            </p>
            {method.href ? (
              <a
                href={method.href}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                <Mail className="h-4 w-4" />
                {method.action}
              </a>
            ) : (
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Clock className="h-4 w-4" />
                {method.actionLabel}: {method.action}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Form */}
      <div className="mb-16">
        <h2 className="mb-6 text-center text-2xl font-bold text-[var(--foreground)]">
          留言反馈
        </h2>
        <ContactForm />
      </div>

      {/* FAQ Section */}
      <div className="mb-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-[var(--foreground)]">
          常见问题
        </h2>
        <div className="space-y-4">
          {faqItems.map((item, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <h3 className="mb-2 font-semibold text-[var(--foreground)]">
                {item.q}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust banner */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-gradient-to-r from-[var(--primary)]/5 to-transparent p-6 text-center">
        <Shield className="mx-auto mb-3 h-8 w-8 text-[var(--primary)]" />
        <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">
          安全保障承诺
        </h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          {SITE_NAME} 承诺保护您的个人信息安全，所有交易数据均经过加密处理。
          如有任何安全相关疑问，请立即联系我们。
        </p>
      </div>
    </div>
  );
}
