"use client";

import { motion } from "motion/react";

/**
 * Admin route template — runs on every navigation within admin.
 * Provides a subtle fade-in page transition.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
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
