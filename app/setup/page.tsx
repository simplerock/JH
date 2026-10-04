import { redirect } from "next/navigation";
import { configProblems, isConfigured, supabaseUrl } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function Setup() {
  if (isConfigured) redirect("/");
  const fresh = !supabaseUrl;
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold">{fresh ? "Nästan klart" : "En nyckel behöver rättas"}</h1>
      {fresh ? (
        <>
          <p className="text-muted">Appen behöver en Supabase-databas. Det tar fem minuter.</p>
          <ol className="card list-decimal space-y-2 pl-8 text-sm">
            <li>Skapa ett gratis projekt på supabase.com.</li>
            <li>Kör <code>supabase/setup.sql</code> i SQL Editor.</li>
            <li>Lägg in nycklarna från Project Settings → API Keys (se <code>.env.example</code>).</li>
            <li>Starta om eller publicera om appen.</li>
          </ol>
        </>
      ) : (
        <>
          <ul className="card list-disc space-y-2 pl-8 text-sm">
            {configProblems.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <p className="text-sm text-muted">Ändra värdet i Vercel under Settings → Environments → Production och publicera om.</p>
        </>
      )}
    </main>
  );
}
