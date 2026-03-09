"use client";

import { useEffect } from "react";

/**
 * Global client-side error handler.
 * Catches unhandled promise rejections and runtime errors,
 * logs them to console in dev, prevents silent failures in production.
 */
export default function ErrorHandler() {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[Unhandled Rejection]", event.reason);
      }
    };

    const handleError = (event: ErrorEvent) => {
      // Skip errors from browser extensions or third-party scripts
      if (event.filename && !event.filename.includes(window.location.origin)) {
        return;
      }
      if (process.env.NODE_ENV === "development") {
        console.error("[Runtime Error]", event.error || event.message);
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
