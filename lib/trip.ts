import { z } from "zod";

// Reseinformation som sparas i events.details. Samma schema används när Claude läser underlagen.
// Fälten är nullable i stället för optional, eftersom strukturerad output kräver att alla fält finns.

export const Flight = z.object({
  date: z.string().nullable().describe("Avresedatum YYYY-MM-DD"),
  flight_no: z.string().nullable().describe("Flightnummer, t.ex. MF 8656"),
  from: z.string().nullable().describe("Avreseort och flygplatskod, t.ex. Kuala Lumpur (KUL)"),
  to: z.string().nullable().describe("Ankomstort och flygplatskod"),
  depart: z.string().nullable().describe("Avgångstid HH:MM lokal tid"),
  arrive: z.string().nullable().describe("Ankomsttid HH:MM lokal tid"),
  booking_ref: z.string().nullable().describe("Bokningsnummer eller e-biljett, om det finns"),
});

export const Hotel = z.object({
  name: z.string(),
  check_in: z.string().nullable().describe("YYYY-MM-DD"),
  check_out: z.string().nullable().describe("YYYY-MM-DD"),
  address: z.string().nullable(),
  phone: z.string().nullable(),
});

export const Day = z.object({
  date: z.string().nullable().describe("YYYY-MM-DD om det går att räkna ut"),
  text: z.string().describe("Kort sammanfattning av dagen på svenska"),
});

export const TripDetails = z.object({
  flights: z.array(Flight),
  hotels: z.array(Hotel),
  days: z.array(Day),
  important: z.array(z.string()).describe("Viktigt att veta: tider, mötesplatser, villkor, på svenska"),
});

export const TripExtraction = TripDetails.extend({
  title: z.string().nullable().describe("Kort namn på resan, t.ex. resmålet"),
  start_date: z.string().nullable().describe("YYYY-MM-DD"),
  end_date: z.string().nullable().describe("YYYY-MM-DD"),
  location: z.string().nullable(),
  booked: z.boolean().nullable().describe("true bara om underlagen visar en bekräftad bokning med bokningsnummer eller e-biljett"),
  packing: z.array(z.string()).describe("Förslag på packlista utifrån resmål, årstid och aktiviteter, på svenska"),
});

export type Flight = z.infer<typeof Flight>;
export type Hotel = z.infer<typeof Hotel>;
export type Day = z.infer<typeof Day>;
export type TripDetails = z.infer<typeof TripDetails>;
export type TripExtraction = z.infer<typeof TripExtraction>;

export const emptyDetails = (): TripDetails => ({ flights: [], hotels: [], days: [], important: [] });

/** Läser details från databasen tåligt: saknade eller trasiga fält blir tomma listor. */
export function readDetails(raw: unknown): TripDetails {
  const parsed = TripDetails.partial().safeParse(raw);
  const d = parsed.success ? parsed.data : {};
  return { flights: d.flights ?? [], hotels: d.hotels ?? [], days: d.days ?? [], important: d.important ?? [] };
}

const key = (f: Flight) => `${f.date ?? ""}|${(f.flight_no ?? "").replace(/\s/g, "").toUpperCase()}`;

/**
 * Lägger ihop befintlig info med nya underlag. Nya flyg ersätter gamla med samma datum och flightnummer
 * (en bekräftelse fyller på bokningsnumret), nya hotell och dagar ersätter listan om de finns.
 */
export function mergeDetails(current: TripDetails, incoming: TripDetails): TripDetails {
  const flights = new Map(current.flights.map((f) => [key(f), f]));
  for (const f of incoming.flights) {
    const old = flights.get(key(f));
    flights.set(key(f), old ? { ...old, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== null && v !== "")) } : f);
  }
  return {
    flights: [...flights.values()].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    hotels: incoming.hotels.length ? incoming.hotels : current.hotels,
    days: incoming.days.length ? incoming.days : current.days,
    important: [...new Set([...current.important, ...incoming.important])],
  };
}

export const SUPPORTED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "text/plain", "message/rfc822", "text/html"];
