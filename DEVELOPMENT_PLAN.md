# 高端数字商品交易平台 — 完整开发方案

> 项目代号：PJ37 | 基于 gmailbuy.com 分析，全面超越其功能与体验

---

## 一、项目概述

### 1.1 目标
搭建一个现代化、高端感的数字商品（账号类）自助交易平台，在功能上覆盖 gmailbuy.com 的所有能力，同时在视觉设计、交互体验、技术架构上实现质的飞跃。

### 1.2 与 gmailbuy.com 的核心差异

| 维度 | gmailbuy.com (现状) | 我们的平台 (目标) |
|------|---------------------|-------------------|
| 技术栈 | jQuery + PHP + 传统MPA | Next.js 15 + TypeScript + 现代全栈 |
| 视觉风格 | 蓝色模板、简陋 | 暗色科技风、紫色系、Liquid Glass |
| 交互体验 | 无动效、Layer.js弹窗 | Motion.dev 微动效、流畅过渡 |
| 移动端 | 无响应式适配 | Mobile-First 原生级体验 |
| 购买流程 | 流程不透明、多步跳转 | 3步完成、即时交付 |
| 搜索 | 无搜索功能 | Cmd+K 全局搜索 + 自动补全 |
| 用户仪表盘 | 基础会员中心 | Bento Grid 现代仪表盘 |
| 支付 | 第三方聚合（不透明） | 多通道集成、实时状态反馈 |
| 后台管理 | 推测基础发卡后台 | 完整 Admin Dashboard |

---

## 二、技术栈

### 2.1 前端

```
框架:        Next.js 15 (App Router, RSC)
语言:        TypeScript 5.x
样式:        Tailwind CSS v4
组件库:      shadcn/ui (基于 Radix UI)
动画:        Motion.dev (Framer Motion) + GSAP ScrollTrigger
状态管理:    Zustand (客户端) + TanStack Query v5 (服务端)
表单:        React Hook Form + Zod 验证
图标:        Lucide Icons
字体:        Plus Jakarta Sans + Inter + Noto Sans SC + JetBrains Mono
图表:        Recharts (仪表盘)
通知:        Sonner (Toast)
```

### 2.2 后端

```
运行时:      Node.js 20+ (LTS)
框架:        Next.js API Routes + tRPC (类型安全RPC)
ORM:         Prisma (类型安全数据库操作)
数据库:      PostgreSQL 16 (主数据库)
缓存:        Redis (会话、限流、库存缓存)
认证:        NextAuth.js v5 (Auth.js)
文件存储:    S3 兼容存储 (MinIO 自托管 / 阿里云 OSS)
邮件:        Resend / Nodemailer
```

### 2.3 基础设施

```
部署:        Docker + Docker Compose (自托管)
反向代理:    Nginx / Caddy (自动HTTPS)
CI/CD:       GitHub Actions
监控:        自建统计 (替代百度统计)
日志:        Pino (结构化日志)
```

---

## 三、数据库设计

### 3.1 核心数据模型

```prisma
// ==================== 用户系统 ====================
model User {
  id            String    @id @default(cuid())
  username      String    @unique
  email         String?   @unique
  passwordHash  String
  avatar        String?
  balance       Decimal   @default(0) @db.Decimal(10, 2)
  role          Role      @default(USER)
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  orders        Order[]
  balanceLogs   BalanceLog[]
  favorites     Favorite[]
  coupons       UserCoupon[]
}

enum Role { USER ADMIN SUPER_ADMIN }
enum UserStatus { ACTIVE BANNED INACTIVE }

// ==================== 商品系统 ====================
model Category {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String?
  icon        String?
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())

  products    Product[]
}

model Product {
  id            String    @id @default(cuid())
  name          String
  slug          String    @unique
  description   String    @db.Text
  price         Decimal   @db.Decimal(10, 2)
  originalPrice Decimal?  @db.Decimal(10, 2)
  categoryId    String
  category      Category  @relation(fields: [categoryId], references: [id])
  image         String?
  tags          String[]
  stockCount    Int       @default(0)
  soldCount     Int       @default(0)
  isActive      Boolean   @default(true)
  sortOrder     Int       @default(0)
  deliveryType  DeliveryType @default(AUTO)
  afterSaleHours Int      @default(48)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  cardKeys      CardKey[]
  orderItems    OrderItem[]
  favorites     Favorite[]
}

enum DeliveryType { AUTO MANUAL }

// ==================== 卡密系统 ====================
model CardKey {
  id          String      @id @default(cuid())
  productId   String
  product     Product     @relation(fields: [productId], references: [id])
  content     String      @db.Text    // 加密存储：账号----密码----辅邮
  status      CardKeyStatus @default(AVAILABLE)
  orderId     String?
  orderItem   OrderItem?  @relation(fields: [orderId], references: [id])
  createdAt   DateTime    @default(now())
  soldAt      DateTime?
}

enum CardKeyStatus { AVAILABLE SOLD LOCKED DISABLED }

// ==================== 订单系统 ====================
model Order {
  id            String      @id @default(cuid())
  orderNo       String      @unique  // 可读订单号: ORD-20260307-XXXX
  userId        String?
  user          User?       @relation(fields: [userId], references: [id])
  email         String?     // 游客下单用邮箱
  totalAmount   Decimal     @db.Decimal(10, 2)
  payAmount     Decimal     @db.Decimal(10, 2)
  status        OrderStatus @default(PENDING)
  paymentMethod String?
  paymentId     String?     // 第三方支付流水号
  paidAt        DateTime?
  expireAt      DateTime    // 支付超时时间
  couponId      String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  items         OrderItem[]
}

enum OrderStatus { PENDING PAID DELIVERED CANCELLED REFUNDED EXPIRED }

model OrderItem {
  id          String    @id @default(cuid())
  orderId     String
  order       Order     @relation(fields: [orderId], references: [id])
  productId   String
  product     Product   @relation(fields: [productId], references: [id])
  quantity    Int
  unitPrice   Decimal   @db.Decimal(10, 2)
  cardKeys    CardKey[]
}

// ==================== 余额系统 ====================
model BalanceLog {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  amount      Decimal   @db.Decimal(10, 2)
  type        BalanceType
  description String
  relatedId   String?   // 关联订单号/充值号
  createdAt   DateTime  @default(now())
}

enum BalanceType { RECHARGE PURCHASE REFUND ADMIN_ADJUST }

// ==================== 优惠券系统 ====================
model Coupon {
  id            String    @id @default(cuid())
  code          String    @unique
  type          CouponType
  value         Decimal   @db.Decimal(10, 2)
  minAmount     Decimal?  @db.Decimal(10, 2)
  maxUses       Int?
  usedCount     Int       @default(0)
  startAt       DateTime
  expireAt      DateTime
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())

  users         UserCoupon[]
}

enum CouponType { FIXED PERCENTAGE }

model UserCoupon {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  couponId  String
  coupon    Coupon   @relation(fields: [couponId], references: [id])
  usedAt    DateTime?
}

// ==================== 收藏系统 ====================
model Favorite {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId, productId])
}

// ==================== 文章/教程系统 ====================
model Article {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  content     String    @db.Text
  category    String
  tags        String[]
  isPublished Boolean   @default(false)
  viewCount   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// ==================== 系统配置 ====================
model SiteSetting {
  id    String @id @default(cuid())
  key   String @unique
  value String @db.Text
}
```

---

## 四、系统架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      客户端 (Browser)                    │
│  Next.js App (RSC + Client Components)                  │
│  Tailwind CSS + shadcn/ui + Motion.dev                  │
└─────────────┬──────────────────────┬────────────────────┘
              │ SSR/RSC              │ Client API Calls
              ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Next.js Server                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  App Router   │  │  tRPC Router │  │  API Routes   │ │
│  │  (SSR Pages)  │  │  (类型安全)   │  │  (Webhooks)  │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘ │
│         │                  │                   │         │
│  ┌──────▼──────────────────▼───────────────────▼───────┐ │
│  │              Service Layer (业务逻辑)                │ │
│  │  UserService | ProductService | OrderService | ...  │ │
│  └──────┬──────────────────┬───────────────────┬───────┘ │
│         │                  │                   │         │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌───────▼───────┐ │
│  │   Prisma ORM  │  │    Redis     │  │  第三方服务    │ │
│  │  (PostgreSQL) │  │  (缓存/限流)  │  │ (支付/邮件)   │ │
│  └──────────────┘  └──────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 4.2 目录结构

```
pj37_copy_web/
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   ├── seed.ts                # 种子数据
│   └── migrations/            # 数据库迁移
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (shop)/            # 前台路由组
│   │   │   ├── page.tsx                    # 首页
│   │   │   ├── products/
│   │   │   │   ├── page.tsx                # 产品列表
│   │   │   │   └── [slug]/page.tsx         # 产品详情
│   │   │   ├── category/[slug]/page.tsx    # 分类页
│   │   │   ├── cart/page.tsx               # 购物车
│   │   │   ├── checkout/page.tsx           # 结算
│   │   │   ├── order/
│   │   │   │   ├── [id]/page.tsx           # 订单详情
│   │   │   │   └── search/page.tsx         # 卡密查询
│   │   │   ├── articles/
│   │   │   │   ├── page.tsx                # 文章列表
│   │   │   │   └── [slug]/page.tsx         # 文章详情
│   │   │   └── layout.tsx                  # 前台布局
│   │   │
│   │   ├── (auth)/            # 认证路由组
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   │
│   │   ├── dashboard/         # 用户仪表盘
│   │   │   ├── page.tsx                    # 概览
│   │   │   ├── orders/page.tsx             # 我的订单
│   │   │   ├── balance/page.tsx            # 余额管理
│   │   │   ├── favorites/page.tsx          # 我的收藏
│   │   │   ├── coupons/page.tsx            # 优惠券
│   │   │   ├── settings/page.tsx           # 账户设置
│   │   │   └── layout.tsx                  # 仪表盘布局
│   │   │
│   │   ├── admin/             # 后台管理
│   │   │   ├── page.tsx                    # 管理概览
│   │   │   ├── products/                   # 商品管理
│   │   │   ├── categories/                 # 分类管理
│   │   │   ├── orders/                     # 订单管理
│   │   │   ├── users/                      # 用户管理
│   │   │   ├── card-keys/                  # 卡密管理
│   │   │   ├── coupons/                    # 优惠券管理
│   │   │   ├── articles/                   # 文章管理
│   │   │   ├── settings/                   # 系统设置
│   │   │   └── layout.tsx                  # 后台布局
│   │   │
│   │   ├── api/               # API Routes
│   │   │   ├── trpc/[trpc]/route.ts        # tRPC 入口
│   │   │   ├── auth/[...nextauth]/route.ts # 认证
│   │   │   ├── payment/                    # 支付回调
│   │   │   │   ├── notify/route.ts         # 异步通知
│   │   │   │   └── return/route.ts         # 同步跳转
│   │   │   └── upload/route.ts             # 文件上传
│   │   │
│   │   ├── layout.tsx         # 根布局
│   │   └── globals.css        # 全局样式
│   │
│   ├── components/            # 组件
│   │   ├── ui/                # shadcn/ui 基础组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── layout/            # 布局组件
│   │   │   ├── header.tsx              # 顶部导航
│   │   │   ├── footer.tsx              # 页脚
│   │   │   ├── sidebar.tsx             # 侧边栏
│   │   │   ├── mobile-nav.tsx          # 移动端底部导航
│   │   │   └── theme-toggle.tsx        # 主题切换
│   │   ├── product/           # 产品相关组件
│   │   │   ├── product-card.tsx
│   │   │   ├── product-grid.tsx
│   │   │   ├── product-filters.tsx
│   │   │   ├── product-detail.tsx
│   │   │   └── quantity-selector.tsx
│   │   ├── cart/              # 购物车组件
│   │   │   ├── cart-sheet.tsx
│   │   │   ├── cart-item.tsx
│   │   │   └── cart-summary.tsx
│   │   ├── checkout/          # 结算组件
│   │   │   ├── checkout-form.tsx
│   │   │   └── payment-methods.tsx
│   │   ├── dashboard/         # 仪表盘组件
│   │   │   ├── stats-cards.tsx
│   │   │   ├── recent-orders.tsx
│   │   │   └── balance-chart.tsx
│   │   ├── search/            # 搜索组件
│   │   │   ├── command-menu.tsx        # Cmd+K 搜索
│   │   │   └── search-bar.tsx
│   │   └── shared/            # 通用组件
│   │       ├── copy-button.tsx
│   │       ├── price-tag.tsx
│   │       ├── stock-badge.tsx
│   │       ├── empty-state.tsx
│   │       └── page-transition.tsx
│   │
│   ├── server/                # 服务端代码
│   │   ├── trpc/
│   │   │   ├── router.ts              # tRPC 主路由
│   │   │   ├── context.ts             # 请求上下文
│   │   │   └── routers/
│   │   │       ├── product.ts
│   │   │       ├── order.ts
│   │   │       ├── user.ts
│   │   │       ├── cart.ts
│   │   │       ├── payment.ts
│   │   │       ├── article.ts
│   │   │       └── admin.ts
│   │   ├── services/
│   │   │   ├── product.service.ts
│   │   │   ├── order.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── card-key.service.ts
│   │   │   ├── user.service.ts
│   │   │   └── email.service.ts
│   │   ├── db.ts              # Prisma 客户端实例
│   │   └── redis.ts           # Redis 客户端
│   │
│   ├── hooks/                 # 自定义 Hooks
│   │   ├── use-cart.ts
│   │   ├── use-search.ts
│   │   └── use-theme.ts
│   │
│   ├── stores/                # Zustand Stores
│   │   ├── cart-store.ts
│   │   └── ui-store.ts
│   │
│   ├── lib/                   # 工具函数
│   │   ├── utils.ts
│   │   ├── validators.ts     # Zod schemas
│   │   ├── constants.ts
│   │   ├── crypto.ts         # 卡密加解密
│   │   └── payment/          # 支付适配器
│   │       ├── alipay.ts
│   │       ├── wechat.ts
│   │       └── usdt.ts
│   │
│   └── types/                 # TypeScript 类型
│       └── index.ts
│
├── public/
│   ├── images/
│   └── fonts/
│
├── docker-compose.yml         # Docker 编排
├── Dockerfile                 # 应用容器
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## 五、核心功能模块详细设计

### 5.1 前台商城

#### 模块 A：首页
- Hero 区域：全屏渐变背景 + 粒子动效 + 大标题 + 搜索框
- 快速分类导航：Bento Grid 卡片，hover 光晕效果
- 热销商品轮播：水平滚动，Motion.dev 动画
- 信任区域：即时交付 / 安全保障 / 7×24支持
- 页脚：分类链接 / 帮助 / 支付方式图标

#### 模块 B：产品列表
- 左侧筛选栏：分类、价格区间（滑块）、库存状态、排序方式
- 右侧产品网格：3列（桌面）/ 2列（平板）/ 1列（手机）
- 卡片元素：产品名、价格（原价划线）、库存徽章、快速购买按钮
- 卡片 hover：上浮4px + 紫色光晕
- 支持网格/列表视图切换
- 移动端筛选用底部 Sheet 抽屉

#### 模块 C：产品详情
- 左侧产品图片/图标展示
- 右侧信息区：名称、评分、价格、数量选择器、立即购买 + 加入购物车
- 保障标签：即时交付 ✓、质保保障 ✓、安全支付 ✓
- Tabs：产品描述 / 使用说明 / 售后规则
- 底部相关推荐

#### 模块 D：购物车
- 侧边抽屉形式（非独立页面），点击购物车图标打开
- 商品列表：产品名、单价、数量调节、小计、删除
- 底部固定：总价 + 去结算按钮
- 空购物车状态：友好提示 + 引导浏览

#### 模块 E：结算支付
- 确认订单信息（商品清单、优惠券输入框、金额明细）
- 支付方式选择：余额支付 / 支付宝 / 微信 / USDT
- 支付状态实时轮询（WebSocket 或短轮询）
- 支付成功：成功动画 → 自动展示卡密 → 一键复制 + 下载 + 发送邮件
- 支付超时/失败：友好提示 + 重新支付

#### 模块 F：卡密查询（支持游客）
- 输入订单号 → 查询对应卡密
- 卡密以密码框形式展示，点击显示/复制
- 可选：输入购买时的邮箱辅助查询

#### 模块 G：文章/教程系统
- 文章列表：卡片式布局 + 分类标签筛选
- 文章详情：Markdown 渲染 + 目录导航
- SEO 优化：SSR 渲染、结构化数据

#### 模块 H：全局搜索
- Cmd+K（桌面）/ 搜索图标（移动端）触发 Command Menu
- 实时搜索建议（300ms 防抖）
- 结果分组：产品 / 分类 / 文章
- 最近搜索历史 + 热门搜索标签

### 5.2 用户仪表盘

#### 概览页 (Bento Grid)
- 统计卡片：总订单数、账户余额、待处理订单、优惠券数
- 最近订单列表（5条）
- 快捷操作入口：充值 / 查看卡密 / 帮助

#### 订单管理
- DataTable 表格：订单号、产品名、金额、状态标签、操作
- 状态筛选 Tabs：全部 / 待支付 / 已完成 / 已取消
- 展开行查看卡密详情
- 支持日期范围筛选 + 搜索
- 导出 CSV

#### 余额管理
- 当前余额展示 + 充值按钮
- 余额变动记录表格（充值/消费/退款/调整）
- 充值方式：在线支付 → 自动到账

#### 收藏商品
- 收藏的商品网格展示
- 支持取消收藏 + 快速购买

#### 优惠券
- 可用 / 已用 / 已过期 分类展示
- 优惠券卡片样式（虚线边框、折扣金额、有效期）

#### 账户设置
- 修改密码
- 绑定/修改邮箱
- 头像上传
- 通知偏好

### 5.3 后台管理 (Admin)

#### 管理概览 Dashboard
- 今日数据：销售额、订单数、新用户、库存告警
- 销售趋势图（7天/30天）
- 热销商品排行

#### 商品管理
- CRUD 操作 + 批量上下架
- 富文本编辑器编写产品描述
- 批量导入卡密（CSV/TXT 上传）
- 库存告警设置

#### 卡密管理
- 查看所有卡密（加密显示）
- 批量导入/导出
- 状态管理（可用/已售/禁用）
- 一键补货入口

#### 订单管理
- 全部订单列表 + 高级筛选
- 手动发货（针对人工发货商品）
- 退款处理

#### 用户管理
- 用户列表 + 搜索
- 余额调整（记录日志）
- 封禁/解封用户

#### 系统设置
- 站点名称、Logo、公告
- 支付通道配置
- 邮件模板配置
- SEO 设置

---

## 六、视觉设计规范

### 6.1 主题：「深邃科技」暗色主题（默认）+ 亮色可选

```css
/* ===== 暗色主题 (默认) ===== */
--background:       #0A0A0F;
--card:             #13131A;
--card-hover:       #1C1C27;
--border:           #2A2A3A;
--primary:          #6C5CE7;    /* 紫色主色 */
--primary-hover:    #7C6FF0;
--accent:           #00D2FF;    /* 青色强调 */
--success:          #00E676;
--warning:          #FFB74D;
--destructive:      #FF5252;
--text-primary:     #F0F0F5;
--text-secondary:   #9393A8;
--text-muted:       #555568;

/* ===== 亮色主题 ===== */
--background:       #FFFFFF;
--card:             #F8F9FC;
--card-hover:       #F0F2F7;
--border:           #E2E8F0;
--primary:          #4F46E5;
--text-primary:     #1A1A2E;
--text-secondary:   #64748B;

/* ===== 设计 Token ===== */
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;
--radius-xl: 24px;

--shadow-glow: 0 0 20px rgba(108, 92, 231, 0.3);
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
```

### 6.2 字体

```
标题: Plus Jakarta Sans (700/800)
正文: Inter (400/500)
中文: Noto Sans SC
等宽: JetBrains Mono (卡密展示)
```

### 6.3 交互动效规范

| 交互 | 动效 | 时长 |
|------|------|------|
| 按钮 hover | scale(1.02) + 背景加亮 | 150ms |
| 按钮点击 | scale(0.98) | 50ms |
| 卡片 hover | translateY(-4px) + 紫色光晕 | 250ms |
| 页面进入 | opacity 0→1 + translateY(20→0) | 300ms |
| 页面退出 | opacity 1→0 + translateY(0→-10) | 200ms |
| Toast 通知 | 右侧滑入 + 弹性 | 300ms |
| 骨架屏 | shimmer 光泽动画 | 循环 |

---

## 七、安全性设计

### 7.1 数据安全
- 密码：bcrypt 哈希（salt rounds: 12）
- 卡密：AES-256-GCM 加密存储，解密仅在交付时
- 敏感操作：CSRF Token 保护
- SQL注入：Prisma 参数化查询（自动防御）
- XSS：React 自动转义 + CSP 头

### 7.2 防刷防滥用
- API 限流：Redis 令牌桶（登录5次/分、查询10次/分）
- 注册：邮箱验证 + 图形验证码（hCaptcha/Turnstile）
- 购买：库存乐观锁（防超卖）+ 订单15分钟超时
- 敏感API：JWT + 权限中间件

### 7.3 支付安全
- 支付回调：签名验证 + IP 白名单
- 订单金额：服务端计算，不信任前端提交
- 幂等性：支付回调幂等处理（防重复发货）

---

## 八、开发阶段规划

### Phase 1：基础框架 + 首页 + 产品展示（第1-2周）

```
✅ 项目初始化（Next.js + TypeScript + Tailwind + shadcn/ui）
✅ 数据库搭建（PostgreSQL + Prisma schema + 迁移）
✅ 基础布局（Header + Footer + 主题切换 + 移动端导航）
✅ 首页开发（Hero + 分类导航 + 热销商品 + 信任区域）
✅ 产品列表页（筛选 + 网格 + 分页）
✅ 产品详情页（信息展示 + 数量选择）
✅ 全局搜索（Cmd+K Command Menu）
```

### Phase 2：用户系统 + 购物车 + 订单（第3-4周）

```
✅ 用户认证（注册 / 登录 / 找回密码）
✅ 购物车功能（添加 / 修改 / 删除 / 侧边抽屉）
✅ 订单创建流程
✅ 卡密查询系统
✅ 用户仪表盘（概览 + 订单列表）
✅ 余额系统
```

### Phase 3：支付集成 + 自动发货（第5-6周）

```
✅ 支付通道集成（支付宝 / 微信 / 余额）
✅ 支付回调处理
✅ 自动发货（支付成功 → 分配卡密 → 通知用户）
✅ 订单状态实时更新
✅ 邮件通知（订单确认 / 卡密发送）
✅ 优惠券系统
```

### Phase 4：后台管理系统（第7-8周）

```
✅ Admin Dashboard（数据概览 + 图表）
✅ 商品 CRUD + 批量操作
✅ 卡密管理（批量导入 / 导出）
✅ 订单管理 + 退款
✅ 用户管理
✅ 系统设置
```

### Phase 5：优化与上线（第9-10周）

```
✅ 性能优化（ISR / 图片优化 / 代码分割）
✅ SEO 优化（SSR + 结构化数据 + Sitemap）
✅ 文章/教程系统
✅ 安全加固（限流 / CSRF / CSP）
✅ Docker 容器化部署
✅ 监控 + 日志
✅ 上线测试
```

---

## 九、Docker 部署方案

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/pj37
      - REDIS_URL=redis://redis:6379
      - NEXTAUTH_SECRET=xxx
      - NEXTAUTH_URL=https://yourdomain.com
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=pj37
      - POSTGRES_PASSWORD=password
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 十、关键指标

| 指标 | 目标 |
|------|------|
| 首页加载时间 (LCP) | < 2.5s |
| 首次输入延迟 (FID) | < 100ms |
| 累计布局偏移 (CLS) | < 0.1 |
| Lighthouse 评分 | > 90 |
| 购买完成步骤 | ≤ 3 步 |
| 卡密交付时间 | < 5 秒 (支付成功后) |
| 移动端可用性 | 100% 功能覆盖 |
