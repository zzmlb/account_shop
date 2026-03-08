import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata: Metadata = {
  title: "隐私政策",
  description: `${SITE_NAME} 隐私政策 — 了解我们如何保护您的数据`,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-[var(--foreground)]">
        隐私政策
      </h1>
      <p className="mb-8 text-sm text-[var(--muted-foreground)]">
        最后更新日期：2026年3月1日
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            1. 信息收集
          </h2>
          <p className="mb-3 leading-relaxed text-[var(--muted-foreground)]">
            {SITE_NAME} 在您使用服务时可能收集以下信息：
          </p>
          <ul className="ml-4 list-disc space-y-2 text-[var(--muted-foreground)]">
            <li><strong>账户信息：</strong>用户名、邮箱地址等注册信息。</li>
            <li><strong>交易信息：</strong>订单记录、支付方式、购买的商品信息。</li>
            <li><strong>设备信息：</strong>浏览器类型、IP 地址、设备标识等。</li>
            <li><strong>使用数据：</strong>页面浏览记录、功能使用频率等匿名统计数据。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            2. 信息使用
          </h2>
          <p className="mb-3 leading-relaxed text-[var(--muted-foreground)]">
            收集的信息将用于：
          </p>
          <ul className="ml-4 list-disc space-y-2 text-[var(--muted-foreground)]">
            <li>提供和维护平台服务。</li>
            <li>处理交易和发送订单通知。</li>
            <li>改善用户体验和平台功能。</li>
            <li>防范欺诈和保障交易安全。</li>
            <li>遵守法律法规要求。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            3. 信息保护
          </h2>
          <ul className="ml-4 list-disc space-y-2 text-[var(--muted-foreground)]">
            <li>所有敏感数据采用 AES-256 加密存储。</li>
            <li>密码使用 bcrypt 单向哈希，即使数据泄露也无法还原。</li>
            <li>全站采用 HTTPS 加密传输，防止中间人攻击。</li>
            <li>定期进行安全审计和漏洞扫描。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            4. 信息共享
          </h2>
          <p className="leading-relaxed text-[var(--muted-foreground)]">
            我们不会向第三方出售、出租或交换您的个人信息。仅在以下情况下可能共享：
          </p>
          <ul className="ml-4 mt-3 list-disc space-y-2 text-[var(--muted-foreground)]">
            <li>经您明确同意。</li>
            <li>为完成交易所必需（如支付服务提供商）。</li>
            <li>法律法规要求或司法机关依法要求。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            5. Cookie 使用
          </h2>
          <p className="leading-relaxed text-[var(--muted-foreground)]">
            本平台使用 Cookie 来维持您的登录状态和偏好设置。这些 Cookie 是平台正常运行
            所必需的。您可以通过浏览器设置管理 Cookie，但禁用后可能影响部分功能的使用。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            6. 用户权利
          </h2>
          <ul className="ml-4 list-disc space-y-2 text-[var(--muted-foreground)]">
            <li><strong>访问权：</strong>您可以随时查看和下载自己的个人数据。</li>
            <li><strong>更正权：</strong>您可以更新和修改个人信息。</li>
            <li><strong>删除权：</strong>您可以申请删除账户和相关数据。</li>
            <li><strong>投诉权：</strong>如认为隐私权受到侵犯，可向客服投诉。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            7. 政策更新
          </h2>
          <p className="leading-relaxed text-[var(--muted-foreground)]">
            本隐私政策可能会不时更新。更新后的政策将在本页面发布，
            重大变更会通过邮件或站内通知方式告知您。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            8. 联系我们
          </h2>
          <p className="leading-relaxed text-[var(--muted-foreground)]">
            如对本隐私政策有任何疑问或需要行使您的数据权利，请联系：support@pj37.com
          </p>
        </section>
      </div>
    </div>
  );
}
