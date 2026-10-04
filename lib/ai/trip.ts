import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { TripExtraction } from "@/lib/trip";

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

export type TripFile = { name: string; mime: string; data: Buffer };

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
  const client = new Anthropic();
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
