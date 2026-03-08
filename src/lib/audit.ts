import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("audit");

/**
 * Record an admin action in the audit log.
 * Fire-and-forget: caller does not need to await.
 */
export function logAdminAction(params: {
  adminId: string;
  action: string;
  target?: string;
  detail?: string;
  ip?: string;
}) {
  db.adminAuditLog
    .create({
      data: {
        adminId: params.adminId,
        action: params.action,
        target: params.target || null,
        detail: params.detail || null,
        ip: params.ip || null,
      },
    })
    .catch((err) => {
      log.error({ err, ...params }, "Failed to write audit log");
    });
}
