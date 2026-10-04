import { LogOut, RefreshCw } from "lucide-react";
import { createChild, newInviteCode, signOut, updateMyProfile } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { AddPanel, StatefulForm, SubmitButton } from "@/components/Forms";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { LanguagePicker } from "@/components/LanguagePicker";
import { ThemePicker } from "@/components/ThemePicker";
import { taskProgress } from "@/lib/progress";
import { getI18n } from "@/lib/i18n/server";
import { loadFamilyData } from "@/lib/queries";

const COLORS = ["#2f6f55", "#4f7cff", "#e0679a", "#f59e0b", "#8b5cf6", "#0ea5a4", "#ef4444"];

export default async function FamilyPage() {
  const [{ profile, family, members, tasks, completions, isParent }, { t }] = await Promise.all([loadFamilyData(), getI18n()]);
  const routines = tasks.filter((t) => t.recurrence !== "none");

  return (
    <>
      <PageHeader title={family.name} back={{ href: "/mer", label: t("Mer") }} />

      <section className="group">
        <ul className="divide-y divide-line">
          {members.map((m) => {
            const p = taskProgress(routines.filter((t) => t.assignee === m.id), completions);
            return (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <Avatar name={m.display_name} color={m.color} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {m.display_name} {m.id === profile.id && <span className="text-sm font-normal text-muted">({t("du")})</span>}
                  </p>
                  <p className="text-xs text-muted">{m.role === "parent" ? t("Vuxen") : t("Barn · loggar in som {username}", { username: m.username ?? "" })}</p>
                  {p.total > 0 && <div className="mt-1.5"><ProgressBar thin ratio={p.ratio} /></div>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {isParent && (
        <section className="card">
          <h2 className="font-semibold">{t("Bjud in en vuxen")}</h2>
          <p className="mb-3 text-sm text-muted">{t("De skapar ett konto och anger koden.")}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-xl bg-track px-4 py-2.5 text-center text-xl font-bold tracking-[0.3em]">{family.invite_code}</code>
            <form action={newInviteCode}>
              <button className="btn-ghost" aria-label={t("Ny kod")}><RefreshCw size={16} /></button>
            </form>
          </div>
        </section>
      )}

      {isParent && (
        <AddPanel title={t("Lägg till barn")}>
          <StatefulForm action={createChild}>
            <div>
              <label className="label" htmlFor="name">{t("Namn")}</label>
              <input className="input" id="name" name="name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="username">{t("Användarnamn")}</label>
                <input className="input" id="username" name="username" autoCapitalize="none" pattern="[a-z0-9_]{3,20}" placeholder="ella" required />
              </div>
              <div>
                <label className="label" htmlFor="pin">{t("PIN (4–8 siffror)")}</label>
                <input className="input" id="pin" name="pin" inputMode="numeric" pattern="\d{4,8}" required />
              </div>
            </div>
            <ColorPicker name="color" defaultValue={COLORS[3]} />
            <SubmitButton>{t("Skapa barnkonto")}</SubmitButton>
          </StatefulForm>
        </AddPanel>
      )}

      <ThemePicker />

      <LanguagePicker />

      <AddPanel title={t("Min profil")}>
        <form action={updateMyProfile} className="space-y-3">
          <div>
            <label className="label" htmlFor="myname">{t("Namn")}</label>
            <input className="input" id="myname" name="name" defaultValue={profile.display_name} />
          </div>
          <ColorPicker name="color" defaultValue={profile.color} />
          <SubmitButton>{t("Spara")}</SubmitButton>
        </form>
      </AddPanel>

      <form action={signOut}>
        <button className="btn-ghost w-full"><LogOut size={16} /> {t("Logga ut")}</button>
      </form>
    </>
  );
}

async function ColorPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  const { t } = await getI18n();
  return (
    <fieldset>
      <legend className="label">{t("Färg")}</legend>
      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <label key={c} className="cursor-pointer">
            <input type="radio" name={name} value={c} defaultChecked={c === defaultValue} className="peer sr-only" />
            <span
              className="block size-8 rounded-full ring-offset-2 ring-offset-card peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2"
              style={{ background: c }}
              aria-label={c}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
