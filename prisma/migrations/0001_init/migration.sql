-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "CardKeyStatus" AS ENUM ('AVAILABLE', 'SOLD', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('RECHARGE', 'PURCHASE', 'REFUND', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'REFUND', 'BALANCE', 'SYSTEM', 'COUPON');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'REPLIED', 'CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "avatar" TEXT,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "originalPrice" DECIMAL(10,2),
    "categoryId" TEXT NOT NULL,
    "image" TEXT,
    "tags" TEXT[],
    "stockCount" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deliveryType" "DeliveryType" NOT NULL DEFAULT 'AUTO',
    "afterSaleHours" INTEGER NOT NULL DEFAULT 48,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_keys" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CardKeyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "card_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "payAmount" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "expireAt" TIMESTAMP(3) NOT NULL,
    "couponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "BalanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minAmount" DECIMAL(10,2),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3) NOT NULL,
    "expireAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_coupons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "user_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "href" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_token_idx" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_userId_idx" ON "password_resets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_isActive_sortOrder_idx" ON "products"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "card_keys_productId_status_idx" ON "card_keys"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNo_key" ON "orders"("orderNo");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_orderNo_idx" ON "orders"("orderNo");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "balance_logs_userId_idx" ON "balance_logs"("userId");

-- CreateIndex
CREATE INDEX "balance_logs_userId_createdAt_idx" ON "balance_logs"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_productId_key" ON "favorites"("userId", "productId");

-- CreateIndex
CREATE INDEX "reviews_productId_isVisible_idx" ON "reviews"("productId", "isVisible");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_productId_key" ON "reviews"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "refund_requests_userId_idx" ON "refund_requests"("userId");

-- CreateIndex
CREATE INDEX "refund_requests_orderId_idx" ON "refund_requests"("orderId");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE INDEX "login_logs_userId_idx" ON "login_logs"("userId");

-- CreateIndex
CREATE INDEX "login_logs_createdAt_idx" ON "login_logs"("createdAt");

-- CreateIndex
CREATE INDEX "login_logs_ip_idx" ON "login_logs"("ip");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "contact_messages_createdAt_idx" ON "contact_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_keys" ADD CONSTRAINT "card_keys_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_keys" ADD CONSTRAINT "card_keys_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_logs" ADD CONSTRAINT "balance_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_logs" ADD CONSTRAINT "login_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

