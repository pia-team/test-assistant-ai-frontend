import { getDictionary, getLocale } from "@/lib/i18n";
import { TestRunClient } from "./test-run-client";

export default async function TestRunPage() {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    return <TestRunClient dictionary={dict} />;
}
