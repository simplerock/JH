import type { MaintenanceItem } from "@/lib/types";
import type { ReactNode } from "react";
import { getI18n } from "@/lib/i18n/server";

export async function MaintenanceRow({ item, d, children }: { item: MaintenanceItem; d: number; children?: ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-14 items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{item.title}</p>
        <p className={`text-[13px] ${d < 0 ? "text-warn" : "text-muted"}`}>
          {d < 0 ? t("Försenad {n} dagar", { n: -d }) : d === 0 ? t("Dags idag") : t("Om {n} dagar", { n: d })}
        </p>
      </div>
      {children}
    </div>
  );
}
