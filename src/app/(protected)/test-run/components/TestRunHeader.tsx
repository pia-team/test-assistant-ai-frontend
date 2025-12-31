"use client";

import { motion } from "framer-motion";

interface TestRunHeaderProps {
  title: string;
  subtitle: string;
}

export function TestRunHeader({ title, subtitle }: TestRunHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="space-y-1">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          {title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}
