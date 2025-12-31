import { getDictionary, getLocale } from "@/lib/i18n";
import { OverviewClient } from "./overview-client";

export default async function OverviewPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return <OverviewClient dictionary={dict} />;
}
