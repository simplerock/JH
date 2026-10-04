import { redirect } from "next/navigation";
import { createFamily, joinFamily, signOut } from "@/app/actions";
import { StatefulForm, SubmitButton } from "@/components/Forms";
import { getI18n } from "@/lib/i18n/server";
import { getUser } from "@/lib/session";

export default async function Onboarding() {
  const [{ supabase, user }, { t }] = await Promise.all([getUser(), getI18n()]);
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) redirect("/");

  return (
    <main className="mx-auto max-w-sm space-y-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">{t("Välkommen")}</h1>
        <p className="text-muted">{t("Starta en ny familj, eller gå med i en som redan finns.")}</p>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">{t("Starta en familj")}</h2>
        <StatefulForm action={createFamily} resetOnOk={false}>
          <div>
            <label className="label" htmlFor="family">{t("Familjens namn")}</label>
            <input className="input" id="family" name="family" placeholder={t("Familjen Andersson")} required />
          </div>
          <div>
            <label className="label" htmlFor="name">{t("Ditt namn")}</label>
            <input className="input" id="name" name="name" required />
          </div>
          <SubmitButton>{t("Skapa familj")}</SubmitButton>
        </StatefulForm>
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">{t("Gå med i en familj")}</h2>
        <p className="mb-3 text-sm text-muted">{t("Be den som startade familjen om koden. Den finns under Familj.")}</p>
        <StatefulForm action={joinFamily} resetOnOk={false}>
          <div>
            <label className="label" htmlFor="code">{t("Inbjudningskod")}</label>
            <input className="input uppercase tracking-widest" id="code" name="code" autoCapitalize="characters" required />
          </div>
          <div>
            <label className="label" htmlFor="name2">{t("Ditt namn")}</label>
            <input className="input" id="name2" name="name" required />
          </div>
          <SubmitButton>{t("Gå med")}</SubmitButton>
        </StatefulForm>
      </section>

      <form action={signOut} className="text-center">
        <button className="text-sm text-muted underline">{t("Logga ut")}</button>
      </form>
    </main>
  );
}
