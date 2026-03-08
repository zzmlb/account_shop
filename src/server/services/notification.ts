import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("notification");

type NotificationType = "ORDER" | "REFUND" | "BALANCE" | "SYSTEM" | "COUPON";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  href?: string;
}

/**
 * Fire-and-forget notification creation.
 * Call without await — failures are logged but never thrown.
 */
export function createNotification(params: CreateNotificationParams) {
  db.notification
    .create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        content: params.content,
        href: params.href ?? null,
      },
    })
    .catch((err) => {
      log.warn({ err, userId: params.userId, type: params.type }, "Failed to create notification");
    });
}

/**
 * Create notifications for multiple users (e.g. system broadcasts).
 */
export function createBulkNotifications(
  userIds: string[],
  data: Omit<CreateNotificationParams, "userId">
) {
  if (userIds.length === 0) return;

  db.notification
    .createMany({
      data: userIds.map((userId) => ({
        userId,
        type: data.type,
        title: data.title,
        content: data.content,
        href: data.href ?? null,
      })),
    })
    .catch((err) => {
      log.warn({ err, count: userIds.length, type: data.type }, "Failed to create bulk notifications");
    });
}

/**
 * Notify all admin users about a new order.
 * Fire-and-forget — failures are logged but never thrown.
 */
/**
 * Notify admins when card key stock is insufficient for an order.
 */
export function notifyAdminsStockShortage(orderNo: string, productNames: string[]) {
  db.user
    .findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      select: { id: true },
    })
    .then((admins) => {
      if (admins.length === 0) return;
      const adminIds = admins.map((a) => a.id);
      createBulkNotifications(adminIds, {
        type: "SYSTEM",
        title: `卡密库存不足 - ${orderNo}`,
        content: `订单 ${orderNo} 已支付但卡密库存不足，涉及商品: ${productNames.join("、")}。请尽快补货或手动发货。`,
        href: `/admin/orders`,
      });
    })
    .catch((err) => {
      log.warn({ err, orderNo }, "Failed to notify admins of stock shortage");
    });
}

export function notifyAdminsNewOrder(orderNo: string, payAmount: number, itemCount: number) {
  db.user
    .findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      select: { id: true },
    })
    .then((admins) => {
      if (admins.length === 0) return;
      const adminIds = admins.map((a) => a.id);
      createBulkNotifications(adminIds, {
        type: "ORDER",
        title: `新订单 ${orderNo}`,
        content: `收到新订单，金额 ¥${payAmount.toFixed(2)}，共 ${itemCount} 件商品`,
        href: `/admin/orders`,
      });
    })
    .catch((err) => {
      log.warn({ err, orderNo }, "Failed to notify admins of new order");
    });
}
