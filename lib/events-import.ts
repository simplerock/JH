import { z } from "zod";

// Händelser som Claude hittar i en lapp, ett schema eller ett mejl. Granskas innan de sparas.
export const FoundEvent = z.object({
  title: z.string().describe("Kort titel på svenska, t.ex. Utvecklingssamtal Hayden"),
  date: z.string().describe("YYYY-MM-DD"),
  end_date: z.string().nullable().describe("YYYY-MM-DD om det pågår flera dagar"),
  time: z.string().nullable().describe("HH:MM eller HH:MM–HH:MM om det står"),
  location: z.string().nullable(),
  kind: z.enum(["event", "activity"]).describe("activity för träningar, kurser och fritid, annars event"),
  notes: z.string().nullable().describe("Det viktigaste att komma ihåg: ta med, kostnad, anmälan, på svenska"),
});

export const FoundEvents = z.object({ events: z.array(FoundEvent) });

export type FoundEvent = z.infer<typeof FoundEvent>;
