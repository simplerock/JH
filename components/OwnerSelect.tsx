import { getI18n } from "@/lib/i18n/server";
import type { Profile } from "@/lib/types";

export async function OwnerSelect({ members, name = "owner", defaultValue = "", label }: { members: Profile[]; name?: string; defaultValue?: string; label?: string }) {
  const { t } = await getI18n();
  return (
    <div>
      <label className="label" htmlFor={name}>{label ?? t("Ansvarig")}</label>
      <select className="input" id={name} name={name} defaultValue={defaultValue}>
        <option value="">{t("Ingen")}</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
      </select>
    </div>
  );
}
