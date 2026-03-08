"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowLeft, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ArticleDetail {
  id: string;
  title: string;
  slug: string;
  category: "公告" | "教程" | "帮助";
  date: string;
  readCount: number;
  content: string;
}

interface RelatedArticle {
  title: string;
  slug: string;
  category: "公告" | "教程" | "帮助";
  date: string;
}

const ARTICLES_DB: Record<string, ArticleDetail> = {
  "gmail-account-tutorial": {
    id: "art_001",
    title: "Gmail账号使用教程",
    slug: "gmail-account-tutorial",
    category: "教程",
    date: "2026-03-05",
    readCount: 3842,
    content: `
      <h2>一、账号登录</h2>
      <p>购买完成后，您将收到包含账号和密码的卡密信息。请按照以下步骤安全登录：</p>
      <ol>
        <li>打开浏览器的<strong>无痕模式</strong>（Chrome 按 Ctrl+Shift+N，Firefox 按 Ctrl+Shift+P）。</li>
        <li>访问 <code>https://accounts.google.com</code>，输入提供的邮箱地址。</li>
        <li>在密码页面输入提供的密码，完成登录。</li>
        <li>如果提示安全验证，请按照页面提示完成验证步骤。</li>
      </ol>

      <h2>二、修改密码（强烈建议）</h2>
      <p>为了账号安全，我们<strong>强烈建议</strong>您在首次登录后立即修改密码：</p>
      <ol>
        <li>登录后点击右上角头像，选择「管理您的 Google 账号」。</li>
        <li>进入「安全性」标签页。</li>
        <li>在「登录 Google」部分点击「密码」。</li>
        <li>输入当前密码后设置一个新的强密码（建议包含大小写字母、数字和特殊字符）。</li>
      </ol>

      <h2>三、绑定辅助手机号</h2>
      <p>绑定您自己的手机号可以大幅提升账号安全性，也方便日后找回密码：</p>
      <ol>
        <li>在「安全性」页面找到「您的验证方式」。</li>
        <li>点击「辅助手机号」并添加您的手机号码。</li>
        <li>完成短信验证即可绑定成功。</li>
      </ol>

      <h2>四、开启两步验证</h2>
      <p>两步验证是保护账号的最重要手段之一：</p>
      <ol>
        <li>在「安全性」页面找到「两步验证」。</li>
        <li>点击开始设置，选择验证方式（推荐使用 Google Authenticator 应用）。</li>
        <li>按照提示完成设置并妥善保存备用验证码。</li>
      </ol>

      <h2>五、注意事项</h2>
      <ul>
        <li>首次登录建议使用无痕模式，避免与已有 Google 账号冲突。</li>
        <li>请勿在短时间内频繁切换登录地点，以免触发安全机制。</li>
        <li>如遇到「此账号存在异常活动」提示，请按照页面引导完成身份验证。</li>
        <li>修改密码后请确保新密码已记录在安全的地方。</li>
        <li>如有任何问题，请及时联系平台客服获取帮助。</li>
      </ul>
    `,
  },
  "march-2026-promotion": {
    id: "art_002",
    title: "平台公告：2026年3月促销活动",
    slug: "march-2026-promotion",
    category: "公告",
    date: "2026-03-01",
    readCount: 5621,
    content: `
      <h2>活动时间</h2>
      <p>2026年3月1日 00:00 至 2026年3月31日 23:59（北京时间）</p>

      <h2>活动内容</h2>
      <h3>优惠一：邮箱账号8折</h3>
      <p>活动期间，所有邮箱账号类商品均享受8折优惠，包括 Gmail、Outlook、Yahoo 等全系列邮箱产品。优惠自动生效，无需额外操作。</p>

      <h3>优惠二：VPN 服务满减</h3>
      <p>VPN 服务类商品满 100 元减 20 元。可与其他优惠叠加使用。</p>

      <h3>优惠三：积分双倍</h3>
      <p>活动期间所有订单均可获得双倍积分奖励，积分可在「个人中心-我的积分」中查看和兑换。</p>

      <h2>参与方式</h2>
      <p>无需领券，直接下单即可享受优惠。系统会自动计算并扣减相应金额。</p>

      <h2>温馨提示</h2>
      <ul>
        <li>优惠活动不可与平台其他折扣券叠加（积分双倍除外）。</li>
        <li>退款商品不退还活动优惠金额。</li>
        <li>平台保留活动最终解释权。</li>
      </ul>
    `,
  },
  "crypto-payment-guide": {
    id: "art_003",
    title: "如何使用加密货币支付",
    slug: "crypto-payment-guide",
    category: "教程",
    date: "2026-02-28",
    readCount: 2156,
    content: `
      <h2>支持的加密货币</h2>
      <p>平台目前支持以下加密货币进行支付：</p>
      <ul>
        <li><strong>USDT (TRC-20)</strong> — 推荐，手续费最低</li>
        <li><strong>BTC</strong> — 比特币</li>
        <li><strong>ETH</strong> — 以太坊</li>
      </ul>

      <h2>支付流程</h2>
      <ol>
        <li>选择商品并添加到购物车，进入结算页面。</li>
        <li>在支付方式中选择「加密货币」。</li>
        <li>选择要使用的币种，系统会自动显示对应的收款地址和应付金额。</li>
        <li>使用您的钱包扫描二维码或复制地址完成转账。</li>
        <li>转账完成后等待区块链确认，通常需要 1-30 分钟不等。</li>
        <li>确认到账后系统将自动完成订单并发货。</li>
      </ol>

      <h2>注意事项</h2>
      <ul>
        <li>请务必确认转账金额与订单要求一致。</li>
        <li>转账时请核对收款地址，错误转账无法找回。</li>
        <li>加密货币支付享受额外 2% 折扣优惠。</li>
      </ul>
    `,
  },
  "refund-policy": {
    id: "art_004",
    title: "售后服务与退款政策",
    slug: "refund-policy",
    category: "帮助",
    date: "2026-02-25",
    readCount: 4310,
    content: `
      <h2>售后保障</h2>
      <p>PJ37 平台承诺为所有商品提供售后保障服务。如购买的商品出现质量问题，我们将为您提供免费替换或全额退款。</p>

      <h2>退款条件</h2>
      <ul>
        <li>商品信息与描述不符（如账号无法登录、会员已过期等）。</li>
        <li>商品在购买后 24 小时内出现质量问题。</li>
        <li>未使用/未查看的商品支持无理由退款。</li>
      </ul>

      <h2>退款流程</h2>
      <ol>
        <li>登录账号，进入「我的订单」。</li>
        <li>找到对应订单并点击「申请售后」。</li>
        <li>填写问题描述并提交相关截图。</li>
        <li>客服将在 2 小时内处理您的请求。</li>
        <li>审核通过后退款将在 1-3 个工作日内到账。</li>
      </ol>

      <h2>联系客服</h2>
      <p>如有任何问题可通过以下方式联系我们：在线客服（7x24 小时）、工单系统、邮箱 support@pj37.com。</p>
    `,
  },
  "account-security-guide": {
    id: "art_005",
    title: "账号安全使用指南",
    slug: "account-security-guide",
    category: "教程",
    date: "2026-02-20",
    readCount: 3105,
    content: `
      <h2>为什么账号安全很重要</h2>
      <p>购买的数字商品账号是您的重要资产，正确的安全措施可以有效防止账号被盗或被封禁。</p>

      <h2>安全建议</h2>
      <ol>
        <li><strong>立即修改密码</strong>：收到账号后第一时间修改为自己的强密码。</li>
        <li><strong>开启两步验证</strong>：为账号添加额外的安全保护层。</li>
        <li><strong>使用独立密码</strong>：不要与其他平台使用相同密码。</li>
        <li><strong>避免频繁切换 IP</strong>：短时间内不要在多个地区登录同一账号。</li>
        <li><strong>定期检查登录记录</strong>：关注账号的异常登录活动。</li>
      </ol>
    `,
  },
  "balance-payment-launch": {
    id: "art_006",
    title: "平台升级公告 - 新增余额支付功能",
    slug: "balance-payment-launch",
    category: "公告",
    date: "2026-02-15",
    readCount: 2876,
    content: `
      <h2>新功能上线</h2>
      <p>平台现已支持余额充值和余额支付功能，为您提供更加便捷的购物体验。</p>

      <h2>充值优惠</h2>
      <ul>
        <li>充值满 200 元，额外赠送 10 元</li>
        <li>充值满 500 元，额外赠送 30 元</li>
        <li>充值满 1000 元，额外赠送 80 元</li>
      </ul>

      <h2>使用方式</h2>
      <p>在个人中心选择「余额充值」，选择充值金额并完成支付。余额到账后即可在结算时使用余额支付。</p>
    `,
  },
  "order-tracking-help": {
    id: "art_007",
    title: "订单查询与物流追踪",
    slug: "order-tracking-help",
    category: "帮助",
    date: "2026-02-10",
    readCount: 1987,
    content: `
      <h2>查看订单状态</h2>
      <p>登录后在「我的订单」页面可以查看所有订单。每个订单都有以下状态：</p>
      <ul>
        <li><strong>待支付</strong>：订单已创建，等待付款。</li>
        <li><strong>已支付</strong>：付款成功，正在处理发货。</li>
        <li><strong>已完成</strong>：商品已发货，可在订单详情中查看卡密。</li>
        <li><strong>已取消</strong>：订单已取消。</li>
      </ul>

      <h2>获取卡密信息</h2>
      <p>订单完成后，点击订单详情即可查看商品的卡密信息（账号密码）。建议及时复制并保存到安全的地方。</p>
    `,
  },
  "new-user-guide": {
    id: "art_008",
    title: "新用户注册与首单优惠",
    slug: "new-user-guide",
    category: "帮助",
    date: "2026-02-05",
    readCount: 6543,
    content: `
      <h2>欢迎来到 PJ37</h2>
      <p>PJ37 是一个专业的数字商品交易平台，提供各类优质数字账号和服务。</p>

      <h2>注册步骤</h2>
      <ol>
        <li>点击页面右上角的「注册」按钮。</li>
        <li>填写用户名、邮箱和密码。</li>
        <li>完成邮箱验证即可开始使用。</li>
      </ol>

      <h2>新用户专属优惠</h2>
      <p>注册成功后，您将获得一张 <strong>首单立减 5 元</strong> 优惠券，无门槛使用。请在「个人中心-我的优惠券」中查看。</p>

      <h2>快速上手</h2>
      <ol>
        <li>浏览商品页面，找到心仪的商品。</li>
        <li>选择购买数量，加入购物车或直接购买。</li>
        <li>选择支付方式完成付款。</li>
        <li>在订单详情中获取商品信息。</li>
      </ol>
    `,
  },
};

const RELATED_ARTICLES: RelatedArticle[] = [
  {
    title: "账号安全使用指南",
    slug: "account-security-guide",
    category: "教程",
    date: "2026-02-20",
  },
  {
    title: "售后服务与退款政策",
    slug: "refund-policy",
    category: "帮助",
    date: "2026-02-25",
  },
  {
    title: "如何使用加密货币支付",
    slug: "crypto-payment-guide",
    category: "教程",
    date: "2026-02-28",
  },
];

const categoryColorMap: Record<string, string> = {
  公告: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
  教程: "bg-[var(--primary)]/10 text-[var(--primary)]",
  帮助: "bg-emerald-500/10 text-emerald-600",
};

export default function ArticleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const article = ARTICLES_DB[slug];

  if (!article) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          文章未找到
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          您访问的文章不存在或已被移除
        </p>
        <Link href="/articles">
          <Button className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回帮助中心
          </Button>
        </Link>
      </div>
    );
  }

  // Filter out current article from related
  const relatedList = RELATED_ARTICLES.filter((r) => r.slug !== slug).slice(
    0,
    3
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
        <Link
          href="/"
          className="transition-colors hover:text-[var(--foreground)]"
        >
          首页
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href="/articles"
          className="transition-colors hover:text-[var(--foreground)]"
        >
          帮助中心
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-[var(--foreground)]">
          {article.title}
        </span>
      </nav>

      {/* Back button */}
      <Link href="/articles">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回帮助中心
        </Button>
      </Link>

      {/* Article header */}
      <div className="mb-8">
        <Badge
          variant="secondary"
          className={`mb-4 ${categoryColorMap[article.category] || ""}`}
        >
          {article.category}
        </Badge>
        <h1 className="mb-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
          {article.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {article.date}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {article.readCount.toLocaleString()} 阅读
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mb-8 h-px bg-[var(--border)]" />

      {/* Article content */}
      <div
        className="prose prose-neutral dark:prose-invert max-w-none
          prose-headings:text-[var(--foreground)] prose-headings:font-bold
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-[var(--card-foreground)] prose-p:leading-relaxed prose-p:mb-4
          prose-li:text-[var(--card-foreground)] prose-li:leading-relaxed
          prose-strong:text-[var(--foreground)]
          prose-code:bg-[var(--accent)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-[var(--radius-sm)] prose-code:text-sm
          prose-ol:my-4 prose-ol:pl-6
          prose-ul:my-4 prose-ul:pl-6"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* Divider */}
      <div className="my-12 h-px bg-[var(--border)]" />

      {/* Related articles */}
      {relatedList.length > 0 && (
        <div>
          <h2 className="mb-6 text-xl font-bold text-[var(--foreground)]">
            相关文章
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {relatedList.map((related) => (
              <Link
                key={related.slug}
                href={`/articles/${related.slug}`}
                className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-[var(--primary)]/30 hover:shadow-md"
              >
                <Badge
                  variant="secondary"
                  className={`mb-2 text-xs ${categoryColorMap[related.category] || ""}`}
                >
                  {related.category}
                </Badge>
                <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                  {related.title}
                </h3>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {related.date}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Back to articles */}
      <div className="mt-12 text-center">
        <Link href="/articles">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回帮助中心
          </Button>
        </Link>
      </div>
    </div>
  );
}
