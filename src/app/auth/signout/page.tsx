import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogoIcon } from "@/components/ui/logo";
import { LogOut } from "lucide-react";

export default function SignOutPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-border/50 shadow-xl backdrop-blur-md bg-background/60">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto flex items-center justify-center">
                        <LogoIcon className="w-16 h-16" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold">Signed Out</CardTitle>
                        <CardDescription className="text-muted-foreground mt-2">
                            You have been successfully signed out of your account.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                            <LogOut className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <Button
                            asChild
                            className="w-full py-6 text-base font-medium transition-all hover:scale-[1.02]"
                            size="lg"
                        >
                            <Link href="/login">
                                Sign In Again
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
