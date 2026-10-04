import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/supabase/config";

export default function Setup() {
  if (isConfigured) redirect("/");
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold">Nästan klart</h1>
      <p className="text-muted">Appen behöver en Supabase-databas. Det tar fem minuter.</p>
      <ol className="card list-decimal space-y-2 pl-8 text-sm">
        <li>Skapa ett gratis projekt på supabase.com.</li>
        <li>Kör <code>supabase/migrations/0001_init.sql</code> i SQL Editor.</li>
        <li>Kopiera URL och nycklar från Project Settings → API till <code>.env.local</code> (se <code>.env.example</code>).</li>
        <li>Starta om appen.</li>
      </ol>
    </main>
  );
}
