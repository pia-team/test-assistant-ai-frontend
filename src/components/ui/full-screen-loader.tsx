"use client";

import { motion, AnimatePresence } from "framer-motion";

interface FullScreenLoaderProps {
    isLoading: boolean;
    message?: string;
}

export function FullScreenLoader({ isLoading, message }: FullScreenLoaderProps) {
    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
                    style={{ pointerEvents: "all" }}
                >
                    {/* Click blocker - invisible overlay */}
                    <div
                        className="absolute inset-0"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    />

                    {/* Spinner Container */}
                    <div className="relative flex flex-col items-center gap-6">
                        {/* Multi-layer spinner */}
                        <div className="relative w-24 h-24">
                            {/* Outer ring - slow spin */}
                            <div className="absolute inset-0 rounded-full border-4 border-transparent bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500 animate-spin-slow opacity-80"
                                style={{
                                    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                                    maskComposite: "exclude",
                                    padding: "4px",
                                }}
                            />

                            {/* Middle ring - reverse spin */}
                            <div className="absolute inset-3 rounded-full border-4 border-transparent bg-gradient-to-r from-pink-500 via-orange-400 to-pink-500 animate-spin-reverse opacity-70"
                                style={{
                                    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                                    maskComposite: "exclude",
                                    padding: "4px",
                                }}
                            />

                            {/* Inner glow */}
                            <div className="absolute inset-6 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 animate-pulse-glow" />

                            {/* Center dot */}
                            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 shadow-lg shadow-purple-500/50" />
                        </div>

                        {/* Message */}
                        {message && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-sm font-medium text-foreground/80"
                            >
                                {message}
                            </motion.p>
                        )}

                        {/* Progress bar */}
                        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500 rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 30, ease: "linear" }}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
