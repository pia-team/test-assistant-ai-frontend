import { Suspense } from "react";
import { getDictionary, getLocale } from "@/lib/i18n";
import { EnvironmentsClient } from "./environments-client";
import { Loader2 } from "lucide-react";

export default async function EnvironmentsPage() {
    const locale = await getLocale();
    const dictionary = await getDictionary(locale);

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        }>
            <EnvironmentsClient dictionary={dictionary} />
        </Suspense>
    );
}
