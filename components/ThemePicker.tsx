import { setTheme } from "@/app/actions";
import { Section } from "@/components/Section";
import { getTheme, type Theme } from "@/lib/theme";

const THEMES: [Theme, string][] = [
  ["system", "Auto"],
  ["light", "Ljust"],
  ["dark", "Mörkt"],
];

/** Ljust, mörkt eller samma som telefonen. Sparas i en cookie på den här enheten. */
export async function ThemePicker() {
  const theme = await getTheme();
  return (
    <Section title="Utseende">
      <form action={setTheme} className="grid grid-cols-3 gap-1 py-3" role="radiogroup" aria-label="Utseende">
        {THEMES.map(([value, label]) => (
          <button
            key={value}
            name="theme"
            value={value}
            role="radio"
            aria-checked={theme === value}
            className={`rounded-xl px-2 py-2 text-sm font-medium transition ${theme === value ? "bg-accent text-accent-ink" : "bg-track text-ink"}`}
          >
            {label}
          </button>
        ))}
      </form>
    </Section>
  );
}
