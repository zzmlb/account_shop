"use client";

import { motion } from "motion/react";

/**
 * Shop route template — runs on every navigation within (shop).
 * Provides a subtle fade-in + slide-up page transition.
 */
export default function ShopTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
