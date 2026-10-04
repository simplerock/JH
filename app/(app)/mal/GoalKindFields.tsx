"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";

export function GoalKindFields() {
  const [kind, setKind] = useState<"amount" | "tasks">("amount");
  const { t } = useI18n();
  return (
    <>
      <fieldset>
        <legend className="label">{t("Hur mäts det?")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["amount", "Belopp", "Pengar, kilo, timmar"],
            ["tasks", "Uppgifter", "Bocka av steg"],
          ] as const).map(([value, title, hint]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-xl border p-3 text-sm ${kind === value ? "border-accent bg-accent-soft" : "border-line"}`}
            >
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
              <span className="block font-semibold">{t(title)}</span>
              <span className="text-muted">{t(hint)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {kind === "amount" ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="target">{t("Mål")}</label>
            <input className="input" id="target" name="target" inputMode="decimal" placeholder="30000" required />
          </div>
          <div>
            <label className="label" htmlFor="current">{t("Har nu")}</label>
            <input className="input" id="current" name="current" inputMode="decimal" placeholder="0" />
          </div>
          <div>
            <label className="label" htmlFor="unit">{t("Enhet")}</label>
            <input className="input" id="unit" name="unit" defaultValue="kr" />
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-track px-3 py-2 text-sm text-muted">
          {t("Lägg till steg under Rutiner och koppla dem till målet. Progressen räknas själv.")}
        </p>
      )}
    </>
  );
}
