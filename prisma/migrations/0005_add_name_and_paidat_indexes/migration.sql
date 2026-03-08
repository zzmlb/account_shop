-- Product: name index for search queries
CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products"("name");

-- Order: status + paidAt for refund after-sale window queries
CREATE INDEX IF NOT EXISTS "orders_status_paidAt_idx" ON "orders"("status", "paidAt");
