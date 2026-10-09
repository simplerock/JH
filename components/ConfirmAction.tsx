"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "./I18nProvider";

type Props = {
  action: (form: FormData) => Promise<void>;
  id: string;
  /** Skärmläsartext för första trycket, t.ex. "Återställ Bädda sängen". */
  label: string;
  /** Det som syns innan man tryckt, t.ex. ett kryss eller ordet Återställ. */
  children: ReactNode;
  /** Frågan efter första trycket, t.ex. "Ta bort?". */
  confirm: string;
  className?: string;
};

/**
 * Knapp i två steg: första trycket frågar, andra trycket gör det.
 * Används för allt som tar bort något eller tar bort poäng, så att ett felklick
 * eller ett dubbeltryck (som träffar raden som flyttar upp) inte får följder.
 */
export function ConfirmAction({ action, id, label, children, confirm, className = "p-1 text-muted" }: Props) {
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
          {confirm}
        </button>
      ) : (
        <button aria-label={label} className={className}>
          {children}
        </button>
      )}
    </form>
  );
}
