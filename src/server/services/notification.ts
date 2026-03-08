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
