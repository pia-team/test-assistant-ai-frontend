import { signIn } from "@/lib/auth";
import { getDictionary, getLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

export default async function LoginPage() {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
            <Card className="w-full max-w-md border-border/50 shadow-xl backdrop-blur-sm">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                        <KeyRound className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold">{dict.login.title}</CardTitle>
                        <CardDescription className="text-muted-foreground mt-2">
                            {dict.login.subtitle}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form
                        action={async () => {
                            "use server";
                            await signIn("keycloak", { redirectTo: "/" });
                        }}
                    >
                        <Button
                            type="submit"
                            className="w-full py-6 text-base font-medium gap-3 transition-all hover:scale-[1.02]"
                            size="lg"
                        >
                            <svg
                                className="w-5 h-5"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                            </svg>
                            {dict.login.signInWith} Keycloak
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
