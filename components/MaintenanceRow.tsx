import type { MaintenanceItem } from "@/lib/types";
import type { ReactNode } from "react";

export function MaintenanceRow({ item, d, children }: { item: MaintenanceItem; d: number; children?: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{item.title}</p>
        <p className={`text-[13px] ${d < 0 ? "text-warn" : "text-muted"}`}>
          {d < 0 ? `Försenad ${-d} dagar` : d === 0 ? "Dags idag" : `Om ${d} dagar`}
        </p>
      </div>
      {children}
    </div>
  );
}
