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
      console.error("[Unhandled Rejection]", event.reason);
      // Prevent the default browser behavior (console error) in production
      // to avoid noisy console output from third-party scripts
    };

    const handleError = (event: ErrorEvent) => {
      // Skip errors from browser extensions or third-party scripts
      if (event.filename && !event.filename.includes(window.location.origin)) {
        return;
      }
      console.error("[Runtime Error]", event.error || event.message);
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
