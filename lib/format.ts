export function formatNumber(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

type T = (text: string, vars?: Record<string, string | number>) => string;
const sv: T = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k])) : text);

export function countdown(days: number, t: T = sv): string {
  if (days === 0) return t("Idag");
  if (days === 1) return t("Imorgon");
  if (days < 0) return t("Pågår");
  return t("Om {n} dagar", { n: days });
}
