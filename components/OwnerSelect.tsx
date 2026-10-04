import type { Profile } from "@/lib/types";

export function OwnerSelect({ members, name = "owner", defaultValue = "", label = "Ansvarig" }: { members: Profile[]; name?: string; defaultValue?: string; label?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select className="input" id={name} name={name} defaultValue={defaultValue}>
        <option value="">Ingen</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
      </select>
    </div>
  );
}
