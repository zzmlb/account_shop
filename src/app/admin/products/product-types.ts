// ---------------------------------------------------------------------------
// Shared types for admin product management
// ---------------------------------------------------------------------------

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  image: string | null;
  images: string[];
  tags: string[];
  stockCount: number;
  soldCount: number;
  viewCount: number;
  isActive: boolean;
  sortOrder: number;
  deliveryType: string | null;
  afterSaleHours: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryId: string;
  price: number;
  originalPrice: number;
  image: string | null;
  images: string[];
  stock: number;
  status: "上架" | "下架";
  sales: number;
  views: number;
  description: string;
  tags: string[];
  afterSaleHours: number | null;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export function mapApiProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category.name,
    categoryId: p.categoryId,
    price: p.price,
    originalPrice: p.originalPrice ?? p.price,
    image: p.image,
    images: p.images || [],
    stock: p.stockCount,
    status: p.isActive ? "上架" : "下架",
    sales: p.soldCount,
    views: p.viewCount ?? 0,
    description: p.description,
    tags: p.tags,
    afterSaleHours: p.afterSaleHours,
    sortOrder: p.sortOrder,
  };
}
