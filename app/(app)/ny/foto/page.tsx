import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { aiEnabled } from "@/lib/ai/trip";
import { getI18n } from "@/lib/i18n/server";
import { getSession } from "@/lib/session";
import { PhotoImport } from "./PhotoImport";

export default async function PhotoImportPage() {
  const [{ isParent }, { t }] = await Promise.all([getSession(), getI18n()]);
  if (!isParent) redirect("/");
  return (
    <>
      <PageHeader title={t("Fota en lapp")} back={{ href: "/ny", label: t("Lägg till") }} />
      {aiEnabled() ? (
        <PhotoImport />
      ) : (
        <p className="rounded-2xl bg-card p-4 text-muted">{t("AI-inläsning är inte påslagen. Lägg till ANTHROPIC_API_KEY i inställningarna.")}</p>
      )}
    </>
  );
}
