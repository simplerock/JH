# Familjen

Familjeapp för struktur och tydliga mål. Rutiner, städ, semester och kalender, med progressbars som visar vad familjen jobbar mot.

Mobil först. Installeras på hemskärmen (PWA). Vuxna loggar in med e-post, barn med användarnamn och PIN.

## Kom igång

1. **Supabase.** Skapa ett gratis projekt på [supabase.com](https://supabase.com).
2. **Databasen.** Öppna SQL Editor och kör filerna i `supabase/migrations/` i nummerordning.
3. **Nycklar.** Kopiera `.env.example` till `.env.local` och fyll i från Project Settings → API.
   `SUPABASE_SERVICE_ROLE_KEY` är hemlig och används bara på servern för att skapa barnkonton.
4. **E-postbekräftelse.** Under Authentication → Sign In / Providers kan du stänga av "Confirm email" om du vill slippa bekräftelsemejlet.
5. Kör lokalt:
   ```bash
   npm install
   npm run dev
   ```
6. **Publicera.** Importera repot på [vercel.com](https://vercel.com) och lägg in samma tre variabler.

## Så funkar det

| Roll | Kan |
|---|---|
| Vuxen | Allt. Skapar mål, sysslor, händelser och barnkonton. Bjuder in andra vuxna med en kod. |
| Barn | Ser familjens mål och kalender. Bockar av sina egna och otilldelade sysslor. Ser aldrig budget. |

Behörigheterna sitter i databasen (Row Level Security), inte bara i gränssnittet.

**Mål** mäts antingen i belopp (30 000 kr till semestern) eller i uppgifter (3 av 5 steg klara). Uppgiftsmål räknas automatiskt från kopplade sysslor.

**Sysslor** kan vara dagliga, veckovisa, månadsvisa eller engångs. Avbockningen gäller perioden, så veckosysslor nollställs på måndag.

## Bygga tillsammans

Se [SAMARBETE.md](SAMARBETE.md) för arbetsflödet och [CLAUDE.md](CLAUDE.md) för reglerna Claude följer.

## Tester

```bash
npm run test:unit   # datum- och progresslogik
npm run test:db     # RLS-regler mot en lokal Postgres (kräver postgresql installerat)
npm run test:e2e    # hela flödet i mobilvy, kräver körande app + Supabase (E2E_BASE_URL)
```

## Planerat

Önskelistan ligger som Issues på GitHub.
