import { NextRequest, NextResponse } from "next/server";

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  status: "active" | "inactive" | "out_of_stock";
  salesCount: number;
  description: string;
  createdAt: string;
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod_001",
    name: "Gmail 全新账号",
    slug: "gmail-new-account",
    category: "邮箱账号",
    price: 5.99,
    originalPrice: 9.99,
    stock: 128,
    status: "active",
    salesCount: 2341,
    description: "全新注册的 Gmail 账号，可用于各类服务注册和日常使用。",
    createdAt: "2026-01-15T08:00:00Z",
  },
  {
    id: "prod_002",
    name: "Outlook 企业邮箱",
    slug: "outlook-enterprise",
    category: "邮箱账号",
    price: 12.99,
    originalPrice: 19.99,
    stock: 56,
    status: "active",
    salesCount: 1892,
    description: "Microsoft Outlook 企业级邮箱账号，含 OneDrive 存储空间。",
    createdAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "prod_003",
    name: "Twitter / X 高质量账号",
    slug: "twitter-x-premium",
    category: "社交媒体",
    price: 29.99,
    originalPrice: 49.99,
    stock: 3,
    status: "active",
    salesCount: 876,
    description: "经过养号的高质量 Twitter/X 账号，适合营销推广。",
    createdAt: "2026-01-25T12:00:00Z",
  },
  {
    id: "prod_004",
    name: "Instagram 老号带粉",
    slug: "instagram-aged-account",
    category: "社交媒体",
    price: 45.00,
    stock: 12,
    status: "active",
    salesCount: 654,
    description: "Instagram 老号，自带真实粉丝，账号稳定性高。",
    createdAt: "2026-02-01T09:00:00Z",
  },
  {
    id: "prod_005",
    name: "Netflix 高级会员 1 个月",
    slug: "netflix-premium-1m",
    category: "流媒体",
    price: 15.99,
    originalPrice: 25.00,
    stock: 200,
    status: "active",
    salesCount: 5678,
    description: "Netflix Premium 高级会员一个月，支持 4K 超清和多设备同时观看。",
    createdAt: "2026-02-05T14:00:00Z",
  },
  {
    id: "prod_006",
    name: "Spotify Premium 年卡",
    slug: "spotify-premium-yearly",
    category: "流媒体",
    price: 39.99,
    originalPrice: 68.00,
    stock: 89,
    status: "active",
    salesCount: 3421,
    description: "Spotify Premium 年度订阅，无广告畅听全球音乐。",
    createdAt: "2026-02-10T11:00:00Z",
  },
  {
    id: "prod_007",
    name: "Steam 余额账号 $50",
    slug: "steam-balance-50",
    category: "游戏账号",
    price: 199.00,
    originalPrice: 350.00,
    stock: 0,
    status: "out_of_stock",
    salesCount: 1243,
    description: "Steam 账号内含 $50 余额，可直接购买游戏。",
    createdAt: "2026-02-15T08:00:00Z",
  },
  {
    id: "prod_008",
    name: "Epic Games 全游戏库账号",
    slug: "epic-games-full-library",
    category: "游戏账号",
    price: 89.99,
    stock: 7,
    status: "active",
    salesCount: 432,
    description: "Epic Games 账号含多款免费领取的 3A 大作游戏库。",
    createdAt: "2026-02-18T16:00:00Z",
  },
  {
    id: "prod_009",
    name: "ChatGPT Plus 共享账号",
    slug: "chatgpt-plus-shared",
    category: "软件工具",
    price: 19.99,
    originalPrice: 29.99,
    stock: 45,
    status: "active",
    salesCount: 7890,
    description: "ChatGPT Plus 共享账号，可使用 GPT-4 模型，每日有使用额度。",
    createdAt: "2026-02-20T10:00:00Z",
  },
  {
    id: "prod_010",
    name: "Adobe Creative Cloud 年订阅",
    slug: "adobe-cc-yearly",
    category: "软件工具",
    price: 129.00,
    originalPrice: 199.00,
    stock: 18,
    status: "active",
    salesCount: 2156,
    description: "Adobe Creative Cloud 全家桶年度订阅，含 Photoshop、Illustrator 等全套工具。",
    createdAt: "2026-02-22T13:00:00Z",
  },
  {
    id: "prod_011",
    name: "NordVPN 2 年套餐",
    slug: "nordvpn-2-years",
    category: "VPN 服务",
    price: 59.99,
    originalPrice: 99.00,
    stock: 67,
    status: "active",
    salesCount: 4532,
    description: "NordVPN 两年套餐，全球 5000+ 服务器，极速安全上网。",
    createdAt: "2026-02-25T09:00:00Z",
  },
  {
    id: "prod_012",
    name: "ExpressVPN 1 年订阅",
    slug: "expressvpn-1-year",
    category: "VPN 服务",
    price: 49.99,
    originalPrice: 79.99,
    stock: 34,
    status: "active",
    salesCount: 3210,
    description: "ExpressVPN 一年订阅，业界领先的隐私保护和连接速度。",
    createdAt: "2026-02-28T15:00:00Z",
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort"); // price_asc, price_desc, sales, newest
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);

    let filtered = [...MOCK_PRODUCTS];

    // Filter by category
    if (category && category !== "全部") {
      filtered = filtered.filter((p) => p.category === category);
    }

    // Filter by search keyword
    if (search) {
      const keyword = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.description.toLowerCase().includes(keyword) ||
          p.category.toLowerCase().includes(keyword)
      );
    }

    // Sort
    switch (sort) {
      case "price_asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "sales":
        filtered.sort((a, b) => b.salesCount - a.salesCount);
        break;
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      default:
        // Default: sort by sales count descending
        filtered.sort((a, b) => b.salesCount - a.salesCount);
        break;
    }

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedProducts = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      success: true,
      products: paginatedProducts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}
