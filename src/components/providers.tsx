"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "sonner";
import { SocketProvider } from "@/providers/socket-provider";
import { useJobUpdates } from "@/lib/use-job";

function SocketEffects() {
    useJobUpdates();
    return null;
}

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000, // 5 minutes
                        gcTime: 30 * 60 * 1000, // 30 minutes cache
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <SocketProvider>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                    <SocketEffects />
                    <Toaster richColors position="top-right" />
                </ThemeProvider>
            </SocketProvider>
        </QueryClientProvider>
    );
}
