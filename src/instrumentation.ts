/**
 * Next.js instrumentation — runs once when the server starts.
 * Catches unhandled promise rejections to prevent silent crashes.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      console.error("[Server] Unhandled Promise Rejection:", reason);
    });

    process.on("uncaughtException", (error) => {
      console.error("[Server] Uncaught Exception:", error);
      // Let the process crash for truly fatal errors
      // but log them first for debugging
    });
  }
}
