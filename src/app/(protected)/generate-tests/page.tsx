import { getDictionary, getLocale } from "@/lib/i18n";
import { GenerateTestsClient } from "./generate-tests-client";

export default async function GenerateTestsPage() {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    return <GenerateTestsClient dictionary={dict} />;
}
