"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react"; // Wait, Link is component or icon? importing Link from next/link usually.
// Fixing imports:
import NextLink from "next/link";
import { LogoIcon } from "@/components/ui/logo";
import { AlertTriangle } from "lucide-react";

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    let errorMessage = "An unknown error occurred during authentication.";
    if (error === "Configuration") {
        errorMessage = "System configuration error. Please contact a server administrator.";
    } else if (error === "AccessDenied") {
        errorMessage = "You do not have permission to sign in.";
    } else if (error === "Verification") {
        errorMessage = "The sign in link is no longer valid. It may have been used already or it may have expired.";
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-border/50 shadow-xl backdrop-blur-md bg-background/60">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto flex items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center shadow-lg">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-destructive">Authentication Error</CardTitle>
                        <CardDescription className="text-muted-foreground mt-2">
                            {errorMessage}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted/50 p-4 text-sm text-center">
                        <p className="text-muted-foreground">Error Code: <span className="font-mono text-foreground">{error}</span></p>
                    </div>

                    <Button
                        asChild
                        className="w-full py-6 text-base font-medium transition-all hover:scale-[1.02]"
                        size="lg"
                    >
                        <NextLink href="/login">
                            Try Again
                        </NextLink>
                    </Button>
                    <Button
                        asChild
                        variant="ghost"
                        className="w-full"
                        size="sm"
                    >
                        <NextLink href="/home">
                            Go Home
                        </NextLink>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        }>
            <ErrorContent />
        </Suspense>
    );
}
