"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a static background to prevent flash of black/empty content
    return (
      <div className="fixed inset-0 -z-50 bg-background overflow-hidden pointer-events-none" />
    );
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* 
               Solid background layer to ensure we don't see transparency.
               Placed at z-index -2 within this stacking context to sit behind blobs.
            */}
      <div className="absolute inset-0 bg-background z-[-2] transition-colors duration-300" />

      {/* Primary Blob */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
          scale: 1,
          x: [0, 50, -50, 0],
          y: [0, -50, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          opacity: { duration: 1 }, // Fade in quickly
        }}
        className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/40 blur-[100px] z-[-1]"
      />

      {/* Secondary Blob */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
          scale: 1,
          x: [0, -70, 70, 0],
          y: [0, 70, -70, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
          opacity: { duration: 1, delay: 0.5 },
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-secondary/40 blur-[100px] dark:bg-secondary/30 z-[-1]"
      />

      {/* Accent Blob */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
          scale: 1,
          x: [0, 100, -100, 0],
          y: [0, -50, 50, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
          opacity: { duration: 1, delay: 1 },
        }}
        className="absolute top-[30%] left-[30%] w-[50vw] h-[50vw] rounded-full bg-chart-1/40 blur-[100px] z-[-1]"
      />
    </div>
  );
}
