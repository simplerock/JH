# Publicera Home Hub

Körplan för att få appen live. Skriven så att Claude (t.ex. i Claude Desktop med Claude i Chrome) kan följa den steg för steg i ägarens inloggade webbläsare. Klistra aldrig in nycklar i chatten. De ska bara flyttas mellan Supabase och Vercel.

Kod: repot `simplerock/JH`, branch `claude/planering` (innehåller allt). Slå ihop till `main` först om ni vill publicera från `main`.

## 1. Supabase: databasen

Projektet heter **Home Hub** i organisationen **Simplerock**.

1. Öppna projektet → **SQL Editor** → **New query**.
2. Klistra in hela innehållet i `supabase/setup.sql` och tryck **Run**. Ska sluta utan fel. Kör den bara en gång.
3. Kontrollera under **Table Editor** att tabellerna finns (families, profiles, tasks, events, reward_levels m.fl.) och under **Storage** att bucketarna `bevis` och `resor` finns.

## 2. Supabase: inloggning

1. **Authentication → Sign In / Providers → Email**: stäng av **Confirm email**. Spara.
2. **Authentication → URL Configuration**: sätt **Site URL** till appens Vercel-adress när den finns (steg 4).

## 3. Supabase: nycklar som Vercel behöver

**Project Settings → API** (eller **API Keys**):

| Variabel i Vercel | Var i Supabase |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key (publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret). Hemlig. Bara i Vercel. |

## 4. Vercel: publicera

1. vercel.com → **Add New → Project** → importera GitHub-repot `simplerock/JH`. Ge Vercel åtkomst till repot om den frågar.
2. **Production Branch**: `claude/planering` (eller `main` efter sammanslagning).
3. Framework: Next.js (hittas automatiskt). Inga andra build-inställningar.
4. **Environment Variables**: lägg in de tre från steg 3, plus `ANTHROPIC_API_KEY` om AI-inläsningen ska vara på (console.anthropic.com).
5. **Deploy**. När det är klart: kopiera adressen och sätt den som Site URL i steg 2.

## 5. Kontroll

1. Öppna appen på mobilen → **Nytt konto** → skapa familjen → lägg till barnen under Familj.
2. Logga in som ett barn med namn och PIN i ett privat fönster. Barnets Hem ska visa poängkortet.
3. Kalender → **Visa i iPhone- eller Google-kalendern** → länken ska ladda ner en kalenderfil.
4. Installera på hemskärmen: Safari → Dela → Lägg till på hemskärmen.

## Om något går fel

- **Run i SQL Editor ger fel om något som redan finns**: setup.sql har redan körts. Kör den inte igen.
- **Inloggning fungerar men barnkonto ger fel**: `SUPABASE_SERVICE_ROLE_KEY` saknas eller är fel i Vercel.
- **Foton laddas inte upp**: kontrollera att bucketen `bevis` finns under Storage.
