import { getI18n } from "@/lib/i18n/server";

/** Visas direkt medan sidan hämtar data. Samma form som en vanlig sida: rubrik och två grupper. */
export default async function Loading() {
  const { t } = await getI18n();
  return (
    <div className="flex animate-pulse flex-col gap-7" aria-busy="true">
      <span className="sr-only" role="status">{t("Laddar")}</span>
      <div className="flex flex-col gap-2 pt-1">
        <div className="h-3.5 w-28 rounded-full bg-track" />
        <div className="h-7 w-48 rounded-full bg-track" />
      </div>
      {[3, 2].map((rows, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="h-3 w-24 rounded-full bg-track" />
          <div className="flex flex-col gap-4 rounded-2xl bg-card px-4 py-4">
            {Array.from({ length: rows }, (_, j) => (
              <div key={j} className="h-4 rounded-full bg-track" style={{ width: `${80 - j * 15}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
