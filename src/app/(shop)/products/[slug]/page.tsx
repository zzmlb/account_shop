import ProductDetailContent from "./product-detail-content";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return {
    title: product
      ? `${product.name} - PJ37 数字商品交易平台`
      : "商品未找到 - PJ37",
    description: product?.description ?? "数字商品详情页",
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  const relatedProducts = getRelatedProducts(slug);

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          商品未找到
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          该商品可能已下架或链接无效
        </p>
      </div>
    );
  }

  return (
    <ProductDetailContent product={product} relatedProducts={relatedProducts} />
  );
}

// ---------- Mock data helpers ----------

interface MockProduct {
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  stockCount: number;
  soldCount: number;
  categoryName: string;
  description: string;
  instructions: string;
  afterSales: string;
}

const MOCK_PRODUCTS: MockProduct[] = [
  {
    name: "Gmail 全新账号",
    slug: "gmail-new-account",
    price: 5.99,
    originalPrice: 9.99,
    stockCount: 128,
    soldCount: 2341,
    categoryName: "邮箱账号",
    description:
      "全新注册的 Gmail 邮箱账号，使用独立 IP 注册，安全可靠。账号已通过手机验证，可正常使用所有 Google 服务，包括 Google Drive、YouTube、Google Play 等。适用于海外业务、注册外区服务等多种场景。",
    instructions:
      "1. 购买后在「我的订单」中查看账号密码\n2. 登录 Gmail 后建议立即修改密码\n3. 建议绑定自己的手机号作为辅助验证\n4. 首次登录可能需要完成安全验证",
    afterSales:
      "1. 账号保证首次登录成功，如无法登录请在 24 小时内联系客服\n2. 因买家操作导致的封号不在售后范围内\n3. 账号售出后不支持无理由退款\n4. 如账号信息有误，支持免费换货一次",
  },
  {
    name: "Outlook 企业邮箱",
    slug: "outlook-enterprise",
    price: 12.99,
    originalPrice: 19.99,
    stockCount: 56,
    soldCount: 1892,
    categoryName: "邮箱账号",
    description:
      "Microsoft Outlook 企业级邮箱账号，自带 5GB OneDrive 存储空间。支持 Office Online 全套应用，适合商务办公使用。账号支持 POP3/IMAP 协议，可配置到任意邮件客户端。",
    instructions:
      "1. 在订单详情页获取账号和密码\n2. 访问 outlook.com 登录\n3. 首次登录后请立即更改密码\n4. 可在邮件客户端中通过 IMAP 配置使用",
    afterSales:
      "1. 7 天内账号异常可免费更换\n2. 不支持用于发送垃圾邮件等违规用途\n3. 因违规使用导致的封禁不在售后范围内",
  },
  {
    name: "Twitter / X 高质量账号",
    slug: "twitter-x-premium",
    price: 29.99,
    originalPrice: 49.99,
    stockCount: 3,
    soldCount: 876,
    categoryName: "社交媒体",
    description:
      "经过养号处理的 Twitter/X 高质量账号，注册时间超过 1 年，有真实互动记录。适合品牌运营、海外营销等需求。账号状态正常，无违规记录。",
    instructions:
      "1. 获取账号信息后登录 twitter.com\n2. 登录后立即修改密码和绑定邮箱\n3. 建议开启两步验证提升安全性\n4. 避免短时间内大量操作以防触发风控",
    afterSales:
      "1. 账号保证首次登录有效\n2. 登录后请在 12 小时内修改密码\n3. 因频繁操作被限制不在售后范围",
  },
  {
    name: "Instagram 老号带粉",
    slug: "instagram-aged-account",
    price: 45.0,
    stockCount: 12,
    soldCount: 654,
    categoryName: "社交媒体",
    description:
      "Instagram 老号，注册时间 2 年以上，自带 500+ 真实粉丝。账号活跃度高，适合直接用于内容运营或品牌推广。已完善个人资料，可直接使用。",
    instructions:
      "1. 获取账号密码后登录 Instagram\n2. 建议通过 APP 登录并绑定手机号\n3. 登录后更换头像和个人简介\n4. 建议前期正常发帖养号",
    afterSales:
      "1. 保证首次登录成功和粉丝数量\n2. 24 小时内如有问题可联系客服\n3. 买家自行操作导致的问题不在售后范围内",
  },
  {
    name: "Netflix 高级会员 1 个月",
    slug: "netflix-premium-1m",
    price: 15.99,
    originalPrice: 25.0,
    stockCount: 200,
    soldCount: 5678,
    categoryName: "流媒体",
    description:
      "Netflix Premium 高级会员共享账号，支持 4K HDR 画质，同时支持 4 台设备在线观看。覆盖全球影视资源，无广告观影体验。独立观看记录，不影响其他用户。",
    instructions:
      "1. 获取账号和专属 Profile 信息\n2. 使用指定的 Profile 登录观看\n3. 请勿修改账号密码或 Profile 设置\n4. 如遇无法登录请联系客服更换",
    afterSales:
      "1. 有效期内出现问题可免费更换\n2. 请勿修改密码，否则视为违规\n3. 支持按剩余天数退款",
  },
  {
    name: "Spotify Premium 年卡",
    slug: "spotify-premium-yearly",
    price: 39.99,
    originalPrice: 68.0,
    stockCount: 89,
    soldCount: 3421,
    categoryName: "流媒体",
    description:
      "Spotify Premium 年度会员，支持无广告音乐收听、离线下载、高品质音频。全球曲库任你听，支持多设备切换使用。",
    instructions:
      "1. 购买后将获得兑换链接或账号信息\n2. 按照说明完成激活\n3. 激活后即可享受 Premium 功能\n4. 建议绑定自己的支付方式以便续费",
    afterSales:
      "1. 激活后有效期内保证可用\n2. 如遇激活失败全额退款\n3. 成功激活后不支持退款",
  },
  {
    name: "Steam 余额账号 $50",
    slug: "steam-balance-50",
    price: 199.0,
    originalPrice: 350.0,
    stockCount: 0,
    soldCount: 1243,
    categoryName: "游戏账号",
    description:
      "预充值 $50 余额的 Steam 账号，可直接用于购买游戏和 DLC。账号地区为美区，支持全球大部分游戏购买。无 VAC 封禁记录，状态良好。",
    instructions:
      "1. 获取 Steam 账号和密码\n2. 通过 Steam 客户端登录\n3. 登录后建议开启 Steam Guard\n4. 余额可用于购买任意美区游戏",
    afterSales:
      "1. 保证账号余额准确\n2. 余额使用后不支持退款\n3. 如账号无法登录 24 小时内联系客服",
  },
  {
    name: "Epic Games 全游戏库账号",
    slug: "epic-games-full-library",
    price: 89.99,
    stockCount: 7,
    soldCount: 432,
    categoryName: "游戏账号",
    description:
      "Epic Games 账号，含历年免费领取的全部游戏。包含数百款优质游戏，包括 GTA V、文明 6、方舟生存进化等热门大作。账号状态良好，可正常游玩。",
    instructions:
      "1. 获取账号密码后登录 Epic Games\n2. 登录后可在游戏库中查看所有游戏\n3. 建议绑定自己的邮箱\n4. 开启两步验证保护账号安全",
    afterSales:
      "1. 保证游戏库内容与描述一致\n2. 如游戏缺失可联系客服核实\n3. 账号使用后不支持退款",
  },
  {
    name: "ChatGPT Plus 共享账号",
    slug: "chatgpt-plus-shared",
    price: 19.99,
    originalPrice: 29.99,
    stockCount: 45,
    soldCount: 7890,
    categoryName: "软件工具",
    description:
      "ChatGPT Plus 共享账号，支持 GPT-4 模型使用。享受更快的响应速度和优先访问新功能。适合个人学习、工作辅助和内容创作。",
    instructions:
      "1. 获取账号密码后登录 chat.openai.com\n2. 使用分配的独立对话窗口\n3. 请勿修改账号密码\n4. 每日使用次数有合理限制",
    afterSales:
      "1. 有效期内保证 GPT-4 可用\n2. 如遇无法使用请联系客服\n3. 请勿违规使用，否则取消服务",
  },
  {
    name: "Adobe Creative Cloud 年订阅",
    slug: "adobe-cc-yearly",
    price: 129.0,
    originalPrice: 199.0,
    stockCount: 18,
    soldCount: 2156,
    categoryName: "软件工具",
    description:
      "Adobe Creative Cloud 全家桶年度订阅，包含 Photoshop、Illustrator、Premiere Pro、After Effects 等 20+ 专业创意工具。支持最新版本更新和 100GB 云存储。",
    instructions:
      "1. 获取激活码或账号信息\n2. 在 Adobe 官网登录并激活\n3. 下载所需的 Creative Cloud 应用\n4. 激活后可使用全部专业功能",
    afterSales:
      "1. 保证激活有效期为 1 年\n2. 激活失败全额退款\n3. 激活成功后不支持退款",
  },
  {
    name: "NordVPN 2 年套餐",
    slug: "nordvpn-2-years",
    price: 59.99,
    originalPrice: 99.0,
    stockCount: 67,
    soldCount: 4532,
    categoryName: "VPN 服务",
    description:
      "NordVPN 2 年期订阅套餐，覆盖 60+ 国家 5500+ 服务器。支持同时连接 6 台设备，提供军用级加密保护。支持流媒体解锁和 P2P 下载。",
    instructions:
      "1. 获取 NordVPN 账号密码\n2. 下载对应平台客户端\n3. 登录后即可使用全部功能\n4. 建议绑定自己的邮箱以接收通知",
    afterSales:
      "1. 有效期内保证可正常使用\n2. 如遇无法连接可联系客服\n3. 支持按剩余时间退款",
  },
  {
    name: "ExpressVPN 1 年订阅",
    slug: "expressvpn-1-year",
    price: 49.99,
    originalPrice: 79.99,
    stockCount: 34,
    soldCount: 3210,
    categoryName: "VPN 服务",
    description:
      "ExpressVPN 1 年期订阅，业界顶尖速度和稳定性。覆盖 94 个国家的 3000+ 服务器，支持所有主流平台。内置广告拦截和恶意软件防护功能。",
    instructions:
      "1. 获取账号信息后登录 ExpressVPN\n2. 下载适用于您设备的客户端\n3. 登录后选择最优服务器连接\n4. 如需帮助可参考官方设置指南",
    afterSales:
      "1. 保证 1 年有效期\n2. 连续 3 天无法使用可申请退款\n3. 因网络环境导致的速度问题不在售后范围内",
  },
];

function getProductBySlug(slug: string): MockProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.slug === slug);
}

function getRelatedProducts(slug: string) {
  const current = MOCK_PRODUCTS.find((p) => p.slug === slug);
  if (!current) return MOCK_PRODUCTS.slice(0, 4);
  return MOCK_PRODUCTS.filter(
    (p) => p.slug !== slug && p.categoryName === current.categoryName
  ).slice(0, 4);
}
