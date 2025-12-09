"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Upload, Play, LogOut, Moon, Sun, Languages, Rocket } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useLocale, type Locale } from "@/components/locale-context";
import { LogoIcon } from "@/components/ui/logo";

export function Navbar() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const { locale, dictionary, setLocale } = useLocale();

    const navItems = [
        { href: "/home", label: dictionary.nav.home, icon: Home },
        { href: "/generate-tests", label: dictionary.nav.generateTests, icon: Rocket },
        { href: "/upload-json", label: dictionary.nav.uploadJson, icon: Upload },
        { href: "/test-run", label: dictionary.nav.testRun, icon: Play },
    ];

    const handleLocaleChange = (newLocale: Locale) => {
        setLocale(newLocale);
    };

    const handleLogout = async () => {
        // Keycloak logout URL with redirect back to signout page
        const keycloakLogoutUrl = `https://diam.dnext-pia.com/realms/orbitant-realm/protocol/openid-connect/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin + '/auth/signout')}&client_id=orbitant-ui-client`;

        // Sign out from NextAuth first (without redirect)
        await signOut({ redirect: false });

        // Redirect to Keycloak logout
        window.location.href = keycloakLogoutUrl;
    };

    return (
        <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/home" className="flex items-center gap-2">
                        <LogoIcon />
                        <span className="font-semibold hidden sm:inline-block">
                            CoTesterAi
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={pathname === item.href ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn(
                                        "gap-2",
                                        pathname === item.href && "bg-secondary"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span className="hidden md:inline-block">{item.label}</span>
                                </Button>
                            </Link>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Language Switcher */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Languages className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => handleLocaleChange("tr")}
                                    className={locale === "tr" ? "bg-secondary" : ""}
                                >
                                    🇹🇷 Türkçe
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleLocaleChange("en")}
                                    className={locale === "en" ? "bg-secondary" : ""}
                                >
                                    🇬🇧 English
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        >
                            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">{dictionary.nav.theme}</span>
                        </Button>

                        {/* Logout */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
