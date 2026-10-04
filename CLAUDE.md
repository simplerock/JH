# Familjen: instruktioner för Claude

Familjeapp som byggs gemensamt av två föräldrar. Båda itererar med Claude. Läs detta innan du ändrar något.

## Stack
- Next.js 15 (App Router, server components, server actions i `app/actions.ts`)
- Supabase: Auth + Postgres + Row Level Security
- Tailwind v4, färger som CSS-variabler i `app/globals.css` (ljust och mörkt läge)
- PWA: `app/manifest.ts`, `public/sw.js`

## Struktur
- `app/(app)/*` inloggade sidor. Mappnamn på svenska: `mal`, `rutiner`, `kalender`, `familj`
- `components/` delade komponenter. Återanvänd `ProgressBar`, `GoalCard`, `TaskRow`, `StatefulForm`, `AddPanel`
- `lib/progress.ts` all progresslogik. `lib/dates.ts` datum i svensk tid, perioder (dag/vecka/månad)
- `lib/session.ts` `getSession()` och `requireParent()`. `lib/queries.ts` gemensam datahämtning
- `supabase/migrations/` databasschema

## Regler
- **UI-text på svenska.** Kort, vardagligt, inga tankstreck i löptext.
- **Mobil först.** Testa i 390 px bredd. Inget som scrollar i sidled.
- **Behörigheter sitter i databasen.** Varje ny tabell får `family_id` med `default public.my_family()` och RLS-policies. Barn får aldrig se pengar. Kolla alltid också `requireParent()` i server actions som bara vuxna får köra.
- **Ändra aldrig en migration som redan körts.** Skapa en ny fil: `supabase/migrations/0002_beskrivning.sql`. Nämn i PR:en att den måste köras i Supabase.
- **Ny tabell = nya RLS-tester** i `supabase/tests/rls.test.sql`.
- Håll ändringar små. En funktion per branch och PR.

## Innan push
```bash
npm run lint && npm run typecheck && npm run test:unit && npm run test:db && npm run build
```
