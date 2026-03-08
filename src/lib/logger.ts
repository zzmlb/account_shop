import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  ...(isProduction
    ? {
        // Structured JSON output in production
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Pretty-print in development
        transport: {
          target: "pino/file",
          options: { destination: 1 },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
});

/**
 * Create a child logger with a module context label.
 * Usage: const log = createLogger("orders");
 */
export function createLogger(module: string) {
  return logger.child({ module });
}
