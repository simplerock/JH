import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { aiEnabled } from "@/lib/ai/trip";
import { getSession } from "@/lib/session";
import { PhotoImport } from "./PhotoImport";

export default async function PhotoImportPage() {
  const { isParent } = await getSession();
  if (!isParent) redirect("/");
  return (
    <>
      <PageHeader title="Fota en lapp" back={{ href: "/ny", label: "Lägg till" }} />
      {aiEnabled() ? (
        <PhotoImport />
      ) : (
        <p className="rounded-2xl bg-card p-4 text-muted">AI-inläsning är inte påslagen. Lägg till ANTHROPIC_API_KEY i inställningarna.</p>
      )}
    </>
  );
}
