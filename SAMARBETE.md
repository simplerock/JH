# Så bygger vi tillsammans

Två personer, en app. Det här håller ordning så att ingen skriver över den andra.

## Grundregeln
**`main` är det som ligger live.** Ingen jobbar direkt i den. Varje idé får en egen branch och blir en pull request (PR) som den andra tittar på innan den slås ihop.

## Arbetsflödet
1. **Idé.** Skriv den som ett Issue på GitHub. Där samlas önskelistan, så ingen idé försvinner i en chatt.
2. **Bygg.** Starta en Claude-session på repot och be om ändringen. Claude jobbar i en egen branch.
3. **Titta.** Vercel skapar automatiskt en förhandsversion för varje PR. Öppna länken på mobilen och testa.
4. **Godkänn.** Den andra kollar och trycker Merge. Ändringen går live direkt.

Små PR:er är bättre än stora. "Lägg till färg på sysslor" går fort att granska. "Gör om hela hem-sidan" blir krock.

## Undvik krockar
- Jobba inte på samma sida samtidigt. Säg till vem som tar vad, eller tilldela Issuet.
- Slå ihop ofta. En branch som lever en vecka blir svår att få in.
- **Databasändringar** kräver ett extra steg: den nya filen i `supabase/migrations/` måste köras i Supabase SQL Editor när PR:en slås ihop. Gör inte två databasändringar samtidigt.

## Bra att veta
- Supabase och Vercel ägs av ett konto. Bjud in den andra under Settings → Team i båda, så kan ni båda se loggar och data.
- Hemliga nycklar ligger aldrig i repot. Bara i `.env.local` och i Vercel.
- `CLAUDE.md` innehåller reglerna Claude följer. Uppdatera den när ni bestämmer något nytt, till exempel ett namn på en färg eller hur något ska se ut.
