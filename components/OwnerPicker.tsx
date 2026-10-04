"use client";

import { useRef } from "react";
import { setOwner } from "@/app/actions";
import type { Profile } from "@/lib/types";
import { useI18n } from "./I18nProvider";

/** Byt ansvarig direkt i listan. Sparas när man väljer. */
export function OwnerPicker({ table, id, owner, members }: { table: "goals" | "projects" | "maintenance_items"; id: string; owner: string | null; members: Profile[] }) {
  const form = useRef<HTMLFormElement>(null);
  const { t } = useI18n();
  return (
    <form ref={form} action={setOwner}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <select
        name="owner"
        defaultValue={owner ?? ""}
        onChange={() => form.current?.requestSubmit()}
        aria-label={t("Ansvarig")}
        className={`rounded-lg bg-track px-2 py-1 text-sm ${owner ? "text-ink" : "text-warn"}`}
      >
        <option value="">{t("Ingen ansvarig")}</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
      </select>
    </form>
  );
}
