-- Performance indexes for common query patterns

-- Product: active + created for public product listing
CREATE INDEX IF NOT EXISTS "products_isActive_createdAt_idx" ON "products"("isActive", "createdAt");

-- Order: status + expireAt for expired order cleanup queries
CREATE INDEX IF NOT EXISTS "orders_status_expireAt_idx" ON "orders"("status", "expireAt");

-- Review: upgrade to compound index for sorted review pagination
DROP INDEX IF EXISTS "reviews_productId_isVisible_idx";
CREATE INDEX IF NOT EXISTS "reviews_productId_isVisible_createdAt_idx" ON "reviews"("productId", "isVisible", "createdAt");

-- Article: published + created for public article listing
CREATE INDEX IF NOT EXISTS "articles_isPublished_createdAt_idx" ON "articles"("isPublished", "createdAt");

-- Coupon: active + expiry for coupon validation during checkout
CREATE INDEX IF NOT EXISTS "coupons_isActive_expireAt_idx" ON "coupons"("isActive", "expireAt");

-- Coupon: code + active for coupon code lookup
CREATE INDEX IF NOT EXISTS "coupons_code_isActive_idx" ON "coupons"("code", "isActive");
