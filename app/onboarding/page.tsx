import { redirect } from "next/navigation";
import { createFamily, joinFamily, signOut } from "@/app/actions";
import { StatefulForm, SubmitButton } from "@/components/Forms";
import { getUser } from "@/lib/session";

export default async function Onboarding() {
  const { supabase, user } = await getUser();
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) redirect("/");

  return (
    <main className="mx-auto max-w-sm space-y-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold">Välkommen</h1>
        <p className="text-muted">Starta en ny familj, eller gå med i en som redan finns.</p>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Starta en familj</h2>
        <StatefulForm action={createFamily} resetOnOk={false}>
          <div>
            <label className="label" htmlFor="family">Familjens namn</label>
            <input className="input" id="family" name="family" placeholder="Familjen Andersson" required />
          </div>
          <div>
            <label className="label" htmlFor="name">Ditt namn</label>
            <input className="input" id="name" name="name" required />
          </div>
          <SubmitButton>Skapa familj</SubmitButton>
        </StatefulForm>
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">Gå med i en familj</h2>
        <p className="mb-3 text-sm text-muted">Be den som startade familjen om koden. Den finns under Familj.</p>
        <StatefulForm action={joinFamily} resetOnOk={false}>
          <div>
            <label className="label" htmlFor="code">Inbjudningskod</label>
            <input className="input uppercase tracking-widest" id="code" name="code" autoCapitalize="characters" required />
          </div>
          <div>
            <label className="label" htmlFor="name2">Ditt namn</label>
            <input className="input" id="name2" name="name" required />
          </div>
          <SubmitButton>Gå med</SubmitButton>
        </StatefulForm>
      </section>

      <form action={signOut} className="text-center">
        <button className="text-sm text-muted underline">Logga ut</button>
      </form>
    </main>
  );
}
