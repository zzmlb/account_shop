import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ==================== Categories ====================
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "email-accounts" },
      update: {},
      create: { name: "邮箱账号", slug: "email-accounts", description: "Gmail、Outlook等邮箱账号", icon: "Mail", sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: "streaming" },
      update: {},
      create: { name: "流媒体", slug: "streaming", description: "Netflix、Spotify、Disney+等会员", icon: "Tv", sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: "vpn-services" },
      update: {},
      create: { name: "VPN服务", slug: "vpn-services", description: "ExpressVPN、NordVPN等VPN套餐", icon: "Shield", sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { slug: "social-media" },
      update: {},
      create: { name: "社交媒体", slug: "social-media", description: "Twitter、Instagram等社交账号", icon: "Share2", sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { slug: "cloud-storage" },
      update: {},
      create: { name: "云存储", slug: "cloud-storage", description: "Google Drive、iCloud等存储空间", icon: "Cloud", sortOrder: 5 },
    }),
    prisma.category.upsert({
      where: { slug: "software" },
      update: {},
      create: { name: "软件工具", slug: "software", description: "ChatGPT、Adobe等软件许可", icon: "Code", sortOrder: 6 },
    }),
    prisma.category.upsert({
      where: { slug: "gaming" },
      update: {},
      create: { name: "游戏", slug: "gaming", description: "Steam、游戏账号等", icon: "Gamepad2", sortOrder: 7 },
    }),
    prisma.category.upsert({
      where: { slug: "others" },
      update: {},
      create: { name: "其他", slug: "others", description: "其他数字商品", icon: "Package", sortOrder: 8 },
    }),
  ]);

  const [emailCat, streamCat, vpnCat, socialCat, cloudCat, softwareCat, gamingCat] = categories;

  console.log(`✅ Created ${categories.length} categories`);

  // ==================== Products ====================
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: "gmail-new-account" },
      update: {},
      create: {
        name: "Gmail 全新账号", slug: "gmail-new-account", description: "全新注册的 Gmail 账号，可用于各类服务注册和日常使用。支持 POP3/IMAP，包含完整的 Google 服务访问权限。",
        price: 5.99, originalPrice: 9.99, categoryId: emailCat.id, stockCount: 128, soldCount: 2341, tags: ["热销", "即时交付"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "outlook-enterprise-email" },
      update: {},
      create: {
        name: "Outlook 企业邮箱", slug: "outlook-enterprise-email", description: "Microsoft Outlook 企业版邮箱账号，包含 50GB 存储空间和完整的 Office 365 Web 应用访问权限。",
        price: 12.99, originalPrice: 19.99, categoryId: emailCat.id, stockCount: 85, soldCount: 1256, tags: ["企业级"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "netflix-premium-1m" },
      update: {},
      create: {
        name: "Netflix 高级会员 1 个月", slug: "netflix-premium-1m", description: "Netflix Premium 会员账号，支持 4K Ultra HD 播放，最多同时 4 台设备在线。",
        price: 15.99, originalPrice: 25.99, categoryId: streamCat.id, stockCount: 64, soldCount: 3456, tags: ["热销", "4K"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "spotify-premium-annual" },
      update: {},
      create: {
        name: "Spotify Premium 年卡", slug: "spotify-premium-annual", description: "Spotify Premium 年度会员，无广告听歌，支持离线下载，全球曲库无限制。",
        price: 39.99, originalPrice: 59.99, categoryId: streamCat.id, stockCount: 42, soldCount: 1890, tags: ["年卡", "无广告"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "disney-plus-annual" },
      update: {},
      create: {
        name: "Disney+ 年卡", slug: "disney-plus-annual", description: "Disney+ 年度会员，享受迪士尼、漫威、星球大战等海量内容。",
        price: 35.00, originalPrice: 49.99, categoryId: streamCat.id, stockCount: 38, soldCount: 920, tags: ["年卡"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "youtube-premium-family" },
      update: {},
      create: {
        name: "YouTube Premium 家庭版", slug: "youtube-premium-family", description: "YouTube Premium 家庭版会员，无广告、可离线、支持 YouTube Music，最多 6 名成员共享。",
        price: 25.00, originalPrice: 35.00, categoryId: streamCat.id, stockCount: 55, soldCount: 1450, tags: ["家庭版"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "expressvpn-1year" },
      update: {},
      create: {
        name: "ExpressVPN 1 年套餐", slug: "expressvpn-1year", description: "全球顶级 VPN 服务，覆盖 94 个国家 160+ 节点，军事级加密，不限带宽不限速。",
        price: 49.99, originalPrice: 79.99, categoryId: vpnCat.id, stockCount: 32, soldCount: 2100, tags: ["年卡", "推荐"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "nordvpn-2year" },
      update: {},
      create: {
        name: "NordVPN 2 年套餐", slug: "nordvpn-2year", description: "老牌 VPN 服务商，双重加密技术，5400+ 全球节点，支持同时 6 台设备连接。",
        price: 59.99, originalPrice: 99.99, categoryId: vpnCat.id, stockCount: 28, soldCount: 1670, tags: ["2年", "高性价比"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "chatgpt-plus-shared" },
      update: {},
      create: {
        name: "ChatGPT Plus 共享账号", slug: "chatgpt-plus-shared", description: "ChatGPT Plus 共享账号，可使用 GPT-4 模型，每日有使用额度。",
        price: 19.99, originalPrice: 29.99, categoryId: softwareCat.id, stockCount: 45, soldCount: 7890, tags: ["热销", "GPT-4"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "twitter-verified-account" },
      update: {},
      create: {
        name: "Twitter/X 蓝标认证账号", slug: "twitter-verified-account", description: "Twitter/X 蓝标认证账号，享有优先展示、更长推文等高级功能。",
        price: 29.99, originalPrice: 45.00, categoryId: socialCat.id, stockCount: 15, soldCount: 560, tags: ["蓝标"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "google-drive-2tb" },
      update: {},
      create: {
        name: "Google Drive 2TB 空间", slug: "google-drive-2tb", description: "Google One 2TB 存储计划，适用于 Google Drive、Gmail 和 Google Photos。",
        price: 18.99, originalPrice: 29.99, categoryId: cloudCat.id, stockCount: 50, soldCount: 980, tags: ["2TB"],
      },
    }),
    prisma.product.upsert({
      where: { slug: "steam-balance-50" },
      update: {},
      create: {
        name: "Steam 余额账号 $50", slug: "steam-balance-50", description: "Steam 账号含 $50 余额，可直接购买游戏、DLC 或市场物品。",
        price: 199.00, originalPrice: 249.00, categoryId: gamingCat.id, stockCount: 10, soldCount: 340, tags: ["$50余额"],
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // ==================== Admin User ====================
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@pj37.com",
      passwordHash: adminHash,
      role: "ADMIN",
      balance: 9999.00,
    },
  });

  // ==================== Test User ====================
  const userHash = await bcrypt.hash("test123", 12);
  const testUser = await prisma.user.upsert({
    where: { username: "testuser" },
    update: {},
    create: {
      username: "testuser",
      email: "test@example.com",
      passwordHash: userHash,
      role: "USER",
      balance: 128.00,
    },
  });

  console.log(`✅ Created admin user (admin/admin123) and test user (testuser/test123)`);

  // ==================== Card Keys (sample) ====================
  const gmailProduct = products[0];
  const cardKeys = [];
  for (let i = 1; i <= 20; i++) {
    const key = `GMAL-${rand4()}-${rand4()}-${rand4()}`;
    cardKeys.push({
      productId: gmailProduct.id,
      content: key,
      status: i <= 15 ? "AVAILABLE" as const : "SOLD" as const,
      soldAt: i > 15 ? new Date() : undefined,
    });
  }
  await prisma.cardKey.createMany({ data: cardKeys, skipDuplicates: true });
  console.log(`✅ Created ${cardKeys.length} card keys for Gmail`);

  // ==================== Articles ====================
  const articles = [
    { title: "Gmail账号使用教程", slug: "gmail-usage-guide", category: "教程", content: "本教程将为您详细介绍如何安全使用Gmail账号...", isPublished: true, viewCount: 1256 },
    { title: "如何使用VPN安全上网", slug: "vpn-safety-guide", category: "教程", content: "VPN是保护网络隐私的重要工具...", isPublished: true, viewCount: 2340 },
    { title: "平台购买流程说明", slug: "purchase-guide", category: "帮助", content: "在PJ37平台购买数字商品非常简单...", isPublished: true, viewCount: 5670 },
    { title: "三月份优惠活动公告", slug: "march-promotion", category: "公告", content: "尊敬的用户，三月份平台推出多项优惠活动...", isPublished: true, viewCount: 890 },
    { title: "Netflix账号使用须知", slug: "netflix-usage-notice", category: "教程", content: "感谢您购买Netflix会员账号...", isPublished: true, viewCount: 1890 },
    { title: "账号安全指南", slug: "account-security", category: "帮助", content: "保护您的账号安全是我们的首要目标...", isPublished: true, viewCount: 3210 },
    { title: "退款政策说明", slug: "refund-policy", category: "帮助", content: "PJ37平台支持在特定条件下的退款...", isPublished: true, viewCount: 4560 },
    { title: "平台升级维护通知", slug: "maintenance-notice", category: "公告", content: "平台将于近期进行系统升级维护...", isPublished: false, viewCount: 120 },
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: article,
    });
  }
  console.log(`✅ Created ${articles.length} articles`);

  // ==================== Coupons ====================
  const coupons = [
    { code: "WELCOME10", type: "FIXED" as const, value: 10.00, minAmount: 50.00, maxUses: 1000, startAt: new Date("2026-01-01"), expireAt: new Date("2026-12-31") },
    { code: "SPRING20", type: "PERCENTAGE" as const, value: 20.00, minAmount: 30.00, maxUses: 500, startAt: new Date("2026-03-01"), expireAt: new Date("2026-03-31") },
    { code: "VIP50", type: "FIXED" as const, value: 50.00, minAmount: 200.00, maxUses: 100, startAt: new Date("2026-01-01"), expireAt: new Date("2026-06-30") },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: coupon,
    });
  }
  console.log(`✅ Created ${coupons.length} coupons`);

  // ==================== Site Settings ====================
  const settings = [
    { key: "site_name", value: "PJ37 Digital" },
    { key: "site_description", value: "高端数字商品交易平台" },
    { key: "announcement", value: "欢迎使用PJ37数字商品平台！新用户注册即送10元优惠券。" },
    { key: "seo_title", value: "PJ37 Digital - 高端数字商品交易平台" },
    { key: "seo_description", value: "PJ37 Digital 提供优质的数字商品自助购买服务，涵盖邮箱、流媒体、VPN、软件等多种品类。" },
    { key: "seo_keywords", value: "数字商品,Gmail,Netflix,VPN,PJ37" },
  ];

  for (const setting of settings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`✅ Created ${settings.length} site settings`);

  console.log("\n🎉 Database seeded successfully!");
}

function rand4(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
