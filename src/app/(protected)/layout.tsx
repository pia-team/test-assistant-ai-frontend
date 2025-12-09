import { Navbar } from "@/components/navbar";
import { LocaleProvider } from "@/components/locale-context";
import { getDictionary, getLocale } from "@/lib/i18n";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    return (
        <LocaleProvider initialLocale={locale} initialDictionary={dict}>
            <div className="min-h-screen bg-transparent/5"> {/* Added slight tint for readability if needed, or just transparent */}
                <Navbar />
                <main className="container mx-auto px-4 py-8">{children}</main>
            </div>
        </LocaleProvider>
    );
}

