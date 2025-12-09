import Link from "next/link";
import { getDictionary, getLocale } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Play, ArrowRight, Rocket } from "lucide-react";

export default async function HomePage() {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    const cards = [
        {
            href: "/generate-tests",
            icon: Rocket,
            title: dict.home.dashboardCard.title,
            description: dict.home.dashboardCard.description,
            gradient: "from-violet-500 to-fuchsia-500",
        },
        {
            href: "/upload-json",
            icon: Upload,
            title: dict.home.uploadCard.title,
            description: dict.home.uploadCard.description,
            gradient: "from-blue-500 to-cyan-500",
        },
        {
            href: "/test-run",
            icon: Play,
            title: dict.home.runCard.title,
            description: dict.home.runCard.description,
            gradient: "from-purple-500 to-pink-500",
        },
    ];

    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-4 py-8">
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    {dict.home.title}
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {dict.home.subtitle}
                </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {cards.map((card) => (
                    <Link key={card.href} href={card.href} className="group">
                        <Card className="h-full border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <CardHeader>
                                <div
                                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                                >
                                    <card.icon className="w-6 h-6 text-white" />
                                </div>
                                <CardTitle className="text-xl">{card.title}</CardTitle>
                                <CardDescription>{card.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="ghost" className="gap-2 p-0 h-auto font-medium">
                                    {dict.common.next}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
