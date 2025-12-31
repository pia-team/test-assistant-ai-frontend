import { getDictionary, getLocale } from "@/lib/i18n";
import { UploadJsonClient } from "./upload-json-client";

export default async function UploadJsonPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return <UploadJsonClient dictionary={dict} />;
}
