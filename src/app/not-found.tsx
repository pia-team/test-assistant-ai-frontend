import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Ghost } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-border/50 shadow-xl backdrop-blur-md bg-background/60 p-8 text-center space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <Ghost className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <CardTitle className="text-3xl font-bold">404</CardTitle>
                    <CardDescription className="text-lg">Page Not Found</CardDescription>
                    <p className="text-sm text-muted-foreground">The page you are looking for doesn't exist or has been moved.</p>
                </div>
                <Button asChild className="w-full" size="lg">
                    <Link href="/home">Return Home</Link>
                </Button>
            </Card>
        </div>
    );
}
