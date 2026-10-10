import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { FoundEvents, type FoundEvent } from "@/lib/events-import";
import { TripExtraction } from "@/lib/trip";

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

export type TripFile = { name: string; mime: string; data: Buffer };

/** SDK:n laddas först när en förälder läser in ett dokument, så att vanliga sidor startar snabbare. */
async function sdk() {
  const [{ default: Client }, { betaZodOutputFormat }] = await Promise.all([
    import("@anthropic-ai/sdk"),
    import("@anthropic-ai/sdk/helpers/beta/zod"),
  ]);
  return { client: new Client(), betaZodOutputFormat };
}

const IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/** Gör om filerna till innehållsblock: PDF som dokument, bilder som bilder, mejl och text som text. */
export function toContentBlocks(files: TripFile[]): Anthropic.Beta.BetaContentBlockParam[] {
  return files.flatMap((f): Anthropic.Beta.BetaContentBlockParam[] => {
    if (f.mime === "application/pdf") {
      return [{ type: "document", title: f.name, source: { type: "base64", media_type: "application/pdf", data: f.data.toString("base64") } }];
    }
    if ((IMAGE as readonly string[]).includes(f.mime)) {
      return [
        { type: "text", text: `Bild: ${f.name}` },
        { type: "image", source: { type: "base64", media_type: f.mime as (typeof IMAGE)[number], data: f.data.toString("base64") } },
      ];
    }
    return [{ type: "text", text: `Fil: ${f.name}\n\n${f.data.toString("utf8")}` }];
  });
}

const INSTRUCTIONS = `Du hjälper en familj att samla information om en resa så att alla vet vad som gäller.
Läs underlagen ovan (resebyråns program, bokningsbekräftelser, e-biljetter, mejl, foton på biljetter) och fyll i reseinformationen.

Regler:
- Ta bara med det som står i underlagen. Gissa inte. Saknas något blir det null eller en tom lista.
- Datum som YYYY-MM-DD. Tider som HH:MM i lokal tid, så som de står.
- booked är true bara om underlagen visar en bekräftad bokning med bokningsnummer eller e-biljett. Ett program eller en offert utan bokning ger false.
- Skriv dagsprogram, viktigt att veta och packlistan på enkel svenska som barn också förstår. Korta rader.
- Viktigt att veta: sådant som annars ger frågor, t.ex. samlingstid på flygplatsen, bagageregler, vad som ingår och inte, villkor vid väderhinder.
- Packlistan utgår från resmål, årstid och aktiviteter i programmet. Högst 15 saker.`;

/** Läser resedokument med Claude och returnerar ett utkast som en förälder granskar innan det sparas. */
export async function extractTrip(files: TripFile[]): Promise<TripExtraction> {
  const { client, betaZodOutputFormat } = await sdk();
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(TripExtraction) },
    messages: [{ role: "user", content: [...toContentBlocks(files), { type: "text", text: INSTRUCTIONS }] }],
  });
  if (response.stop_reason === "refusal") throw new Error("Det gick inte att läsa underlagen. Fyll i för hand.");
  if (!response.parsed_output) throw new Error("Svaret gick inte att tolka. Försök igen eller fyll i för hand.");
  return response.parsed_output;
}

const EVENTS_INSTRUCTIONS = (today: string) => `Underlaget ovan är en lapp från skolan, ett träningsschema, en inbjudan eller ett mejl till en familj.
Hitta alla händelser med datum som familjen behöver ha i kalendern. Idag är det ${today}.

Regler:
- Ta bara med det som står. Gissa inte datum. Saknas året, välj nästa gång datumet infaller från idag.
- Återkommande tillfällen (t.ex. träning varje tisdag under en termin) blir en händelse per tillfälle, högst 20.
- Titlar och anteckningar på kort, enkel svenska. Nämn barnets namn om det står.
- Inga händelser hittade: returnera en tom lista.`;

/** Läser en lapp, ett schema eller ett mejl och returnerar händelser att granska. */
export async function extractEvents(files: TripFile[], text: string, today: string): Promise<FoundEvent[]> {
  const { client, betaZodOutputFormat } = await sdk();
  const content: Anthropic.Beta.BetaContentBlockParam[] = [...toContentBlocks(files)];
  if (text.trim()) content.push({ type: "text", text: `Inklistrad text:\n\n${text}` });
  content.push({ type: "text", text: EVENTS_INSTRUCTIONS(today) });
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(FoundEvents) },
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") throw new Error("Det gick inte att läsa underlaget.");
  if (!response.parsed_output) throw new Error("Svaret gick inte att tolka. Försök igen.");
  return response.parsed_output.events;
}
