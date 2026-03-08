"use client";

import { motion } from "motion/react";

/**
 * Dashboard route template — runs on every navigation within dashboard.
 * Provides a subtle fade-in page transition.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
