import { setLang } from "@/app/actions";
import { Section } from "@/components/Section";
import type { Lang } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

const LANGS: [Lang, string][] = [
  ["sv", "Svenska"],
  ["en", "English"],
];

/** Språkknappar. Utan rubrik passar de på inloggningssidan. */
export function LanguageButtons({ lang, className = "grid grid-cols-2 gap-1" }: { lang: Lang; className?: string }) {
  return (
    <form action={setLang} className={className} role="radiogroup" aria-label="Språk / Language">
      {LANGS.map(([value, label]) => (
        <button
          key={value}
          name="lang"
          value={value}
          role="radio"
          aria-checked={lang === value}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${lang === value ? "bg-accent text-accent-ink" : "bg-track text-ink"}`}
        >
          {label}
        </button>
      ))}
    </form>
  );
}

export async function LanguagePicker() {
  const { t, lang } = await getI18n();
  return (
    <Section title={t("Språk")}>
      <div className="py-3">
        <LanguageButtons lang={lang} />
      </div>
    </Section>
  );
}
