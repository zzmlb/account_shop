import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "服务条款",
  description: `${SITE_NAME} 服务条款与用户协议`,
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-[var(--foreground)]">
        服务条款
      </h1>
      <p className="mb-8 text-sm text-[var(--muted-foreground)]">
        最后更新日期：2026年3月1日
      </p>

      <div className="prose-custom space-y-8">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            1. 服务概述
          </h2>
          <p className="leading-relaxed text-[var(--muted-foreground)]">
            欢迎使用 {SITE_NAME}（以下简称&ldquo;本平台&rdquo;）。本平台是一个数字商品交易平台，
            为用户提供数字商品的浏览、购买和交付服务。使用本平台即表示您同意遵守以下条款。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            2. 用户注册与账户
          </h2>
          <ul className="ml-4 list-disc space-y-2 text-[var(--muted-foreground)]">
            <li>您必须提供真实、准确的注册信息。</li>
            <li>您有责任保管好自己的账户和密码安全。</li>
            <li>每位用户只能注册一个账户，不得转让或出借。</li>
            <li>如发现异常登录，请立即联系客服。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            3. 商品购买与交付
          </h2>
          <ul className="ml-4 list-disc space-y-2 text-[var(--muted-foreground)]">
            <li>本平台销售的均为数字商品（如卡密、兑换码、软件许可等）。</li>
            <li>支付成功后，系统将自动发货，卡密信息将显示在订单详情中。</li>
            <li>请在购买前仔细阅读商品描述，确认商品信息无误。</li>
            <li>数字商品一经交付，原则上不支持退款，特殊情况请联系客服。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            4. 售后服务
          </h2>
          <ul className="ml-4 list-disc space-y-2 text-[var(--muted-foreground)]">
            <li>商品自动发货后，在售后保障期内如遇到问题可申请售后。</li>
            <li>售后保障期限以商品详情页标注为准。</li>
            <li>因用户自身原因（如卡密泄露、操作失误等）导致的损失，平台不承担责任。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            5. 禁止行为
          </h2>
          <ul className="ml-4 list-disc space-y-2 text-[var(--muted-foreground)]">
            <li>利用平台进行任何违法活动。</li>
            <li>使用技术手段攻击或干扰平台正常运行。</li>
            <li>恶意下单、刷单或利用系统漏洞获取不当利益。</li>
            <li>转售通过本平台购买的商品（除非商品允许转售）。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            6. 免责声明
          </h2>
          <p className="leading-relaxed text-[var(--muted-foreground)]">
            本平台作为交易中介，尽最大努力保障商品质量。但对于因第三方服务商原因导致的
            商品失效、功能变更等情况，平台将协助处理但不承担直接责任。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            7. 条款修改
          </h2>
          <p className="leading-relaxed text-[var(--muted-foreground)]">
            本平台保留随时修改服务条款的权利。修改后的条款将在平台上公布，
            继续使用平台服务即表示您同意修改后的条款。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
            8. 联系方式
          </h2>
          <p className="leading-relaxed text-[var(--muted-foreground)]">
            如对本服务条款有任何疑问，请联系我们：support@pj37.com
          </p>
        </section>
      </div>
    </div>
  );
}
