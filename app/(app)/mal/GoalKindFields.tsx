"use client";

import { useState } from "react";

export function GoalKindFields() {
  const [kind, setKind] = useState<"amount" | "tasks">("amount");
  return (
    <>
      <fieldset>
        <legend className="label">Hur mäts det?</legend>
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
              <span className="block font-semibold">{title}</span>
              <span className="text-muted">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {kind === "amount" ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="target">Mål</label>
            <input className="input" id="target" name="target" inputMode="decimal" placeholder="30000" required />
          </div>
          <div>
            <label className="label" htmlFor="current">Har nu</label>
            <input className="input" id="current" name="current" inputMode="decimal" placeholder="0" />
          </div>
          <div>
            <label className="label" htmlFor="unit">Enhet</label>
            <input className="input" id="unit" name="unit" defaultValue="kr" />
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-track px-3 py-2 text-sm text-muted">
          Lägg sen till uppgifter under Rutiner och koppla dem till målet. Progressen räknas automatiskt.
        </p>
      )}
    </>
  );
}
