import type { Metadata } from "next";
import { Shield, Zap, Headphones, Award, Users, Globe } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import Breadcrumb from "@/components/ui/breadcrumb";

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata: Metadata = {
  title: "关于我们",
  description: `了解 ${SITE_NAME} — 专注数字商品的安全交易平台`,
  openGraph: {
    title: `关于我们 - ${SITE_NAME}`,
    description: `了解 ${SITE_NAME} — 专注数字商品的安全交易平台`,
    url: `${SITE_URL}/about`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `关于我们 - ${SITE_NAME}`,
    description: `了解 ${SITE_NAME} — 专注数字商品的安全交易平台`,
  },
  alternates: { canonical: `${SITE_URL}/about` },
};

const features = [
  {
    icon: Zap,
    title: "即时交付",
    description: "全自动发货系统，支付成功后秒级到账，无需等待人工处理。",
  },
  {
    icon: Shield,
    title: "安全保障",
    description: "AES-256 加密存储，全链路 HTTPS 传输，保障您的每一笔交易安全。",
  },
  {
    icon: Headphones,
    title: "全天候支持",
    description: "7×24 小时客服在线，专业团队随时为您解决使用中的问题。",
  },
  {
    icon: Award,
    title: "品质保证",
    description: "严格的供应商审核和商品质检流程，确保每件商品的品质。",
  },
  {
    icon: Users,
    title: "用户至上",
    description: "以用户需求为核心，持续优化产品体验，提供最优质的服务。",
  },
  {
    icon: Globe,
    title: "全球覆盖",
    description: "支持多种支付方式，服务全球用户，随时随地轻松购买。",
  },
];

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `关于 ${SITE_NAME}`,
    description: `了解 ${SITE_NAME} — 专注数字商品的安全交易平台`,
    url: `${SITE_URL}/about`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb items={[{ label: "关于我们" }]} className="mb-6" />
      {/* Hero */}
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
          关于 {SITE_NAME}
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-[var(--muted-foreground)]">
          我们致力于打造最安全、最便捷的数字商品交易平台，
          让每一位用户都能享受到高效、透明的购物体验。
        </p>
      </div>

      {/* Mission */}
      <div className="mb-16 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 sm:p-10">
        <h2 className="mb-4 text-2xl font-semibold text-[var(--foreground)]">
          我们的使命
        </h2>
        <p className="leading-relaxed text-[var(--muted-foreground)]">
          {SITE_NAME} 诞生于对数字商品交易领域的深刻理解。我们发现传统交易方式存在
          效率低、不透明、安全性差等问题，因此打造了这个全自动、安全可靠的交易平台。
          通过先进的技术架构和严格的安全标准，我们为用户提供从浏览、购买到交付的
          一站式无缝体验。
        </p>
      </div>

      {/* Features */}
      <div className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-semibold text-[var(--foreground)]">
          为什么选择我们
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10">
                <feature.icon className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <h3 className="mb-2 font-semibold text-[var(--foreground)]">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 text-center sm:p-10">
        <h2 className="mb-4 text-2xl font-semibold text-[var(--foreground)]">
          联系我们
        </h2>
        <p className="mb-2 text-[var(--muted-foreground)]">
          如有任何问题或建议，请随时联系我们
        </p>
        <p className="text-[var(--primary)]">support@pj37.com</p>
      </div>
    </div>
  );
}
