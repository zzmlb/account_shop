import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { CreditCard, Smartphone, Wallet, Shield, Twitter, Github, MessageCircle } from "lucide-react";

const footerSections = [
  {
    title: "关于我们",
    links: [
      { label: "平台介绍", href: "/about" },
      { label: "服务条款", href: "/terms" },
      { label: "隐私政策", href: "/privacy" },
    ],
  },
  {
    title: "快速链接",
    links: [
      { label: "全部商品", href: "/products" },
      { label: "商品分类", href: "/categories" },
      { label: "优惠活动", href: "/promotions" },
      { label: "卡密查询", href: "/order/search" },
      { label: "使用教程", href: "/articles" },
    ],
  },
  {
    title: "帮助中心",
    links: [
      { label: "常见问题", href: "/articles?tag=faq" },
      { label: "购买指南", href: "/articles?tag=guide" },
      { label: "售后说明", href: "/articles?tag=after-sale" },
    ],
  },
  {
    title: "联系方式",
    links: [
      { label: "联系我们", href: "/contact" },
      { label: "邮箱: support@pj37.com", href: "mailto:support@pj37.com" },
      { label: "订单查询", href: "/order/search" },
    ],
  },
];

const paymentMethods = [
  { icon: CreditCard, label: "银行卡" },
  { icon: Smartphone, label: "支付宝" },
  { icon: Wallet, label: "微信支付" },
  { icon: Shield, label: "安全支付" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer aria-label="网站底部" className="border-t border-[var(--border)] bg-[var(--card)]">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--foreground)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row lg:px-8">
          {/* Copyright */}
          <p className="text-xs text-[var(--muted-foreground)]">
            &copy; {currentYear} {SITE_NAME}. All rights reserved.
          </p>

          {/* Social + Payment */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
            {/* Social links */}
            <div className="flex items-center gap-2">
              {[
                { icon: Twitter, label: "Twitter" },
                { icon: Github, label: "GitHub" },
                { icon: MessageCircle, label: "微信公众号" },
              ].map((social) => (
                <span
                  key={social.label}
                  aria-label={social.label}
                  title={social.label}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted-foreground)] cursor-default"
                >
                  <social.icon className="h-4 w-4" />
                </span>
              ))}
            </div>

            <div className="hidden h-4 w-px bg-[var(--border)] md:block" />

            {/* Payment methods */}
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xs text-[var(--muted-foreground)]">
                支付方式:
              </span>
              <div className="flex items-center gap-2 md:gap-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.label}
                    className="flex items-center gap-1 text-[var(--muted-foreground)]"
                    title={method.label}
                    aria-label={method.label}
                    role="img"
                  >
                    <method.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
