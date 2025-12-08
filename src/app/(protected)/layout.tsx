import { Navbar } from "@/components/navbar";
import { getDictionary, getLocale } from "@/lib/i18n";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    return (
        <div className="min-h-screen bg-background">
            <Navbar dictionary={dict} currentLocale={locale} />
            <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
    );
}
