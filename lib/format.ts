export function formatNumber(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function countdown(days: number): string {
  if (days === 0) return "Idag";
  if (days === 1) return "Imorgon";
  if (days < 0) return "Pågår";
  return `Om ${plural(days, "dag", "dagar")}`;
}
