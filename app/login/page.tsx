import Image from "next/image";
import { LanguageButtons } from "@/components/LanguagePicker";
import { getI18n } from "@/lib/i18n/server";
import { LoginTabs } from "./LoginTabs";

export default async function LoginPage() {
  const { t, lang } = await getI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <Image src="/icon.svg" alt="" width={64} height={64} className="mx-auto mb-4 rounded-2xl" priority />
        <h1 className="text-3xl font-bold tracking-tight">Home Hub</h1>
        <p className="mt-1 text-muted">{t("Rutiner, mål och planer på ett ställe.")}</p>
      </div>
      <LoginTabs />
      <LanguageButtons lang={lang} className="mx-auto mt-6 grid w-48 grid-cols-2 gap-1" />
    </main>
  );
}
