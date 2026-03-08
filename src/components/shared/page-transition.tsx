"use client";

import { motion } from "motion/react";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Lightweight page transition wrapper.
 * Adds a fade-in + slide-up animation when the component mounts.
 * Designed for App Router where AnimatePresence exit animations aren't practical.
 */
export default function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
