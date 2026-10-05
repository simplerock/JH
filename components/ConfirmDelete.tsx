"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "./I18nProvider";

/**
 * Ta bort i två steg: första trycket frågar "Ta bort?", andra trycket tar bort.
 * Annars kan ett dubbeltryck ta bort raden som flyttar upp efter den första.
 */
export function ConfirmDelete({ action, id, label }: { action: (form: FormData) => Promise<void>; id: string; label: string }) {
  const [armed, setArmed] = useState(false);
  const { t } = useI18n();
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <form action={action} onSubmit={(e) => { if (!armed) { e.preventDefault(); setArmed(true); } }}>
      <input type="hidden" name="id" value={id} />
      {armed ? (
        <button aria-label={t("Bekräfta: {label}", { label })} className="rounded-lg bg-warn-soft px-2 py-1 text-[13px] font-semibold text-warn">
          {t("Ta bort?")}
        </button>
      ) : (
        <button aria-label={label} className="p-1 text-muted">
          <X size={15} />
        </button>
      )}
    </form>
  );
}
