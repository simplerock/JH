"use client";

import { useState, useTransition } from "react";
import { FileUp, Plus, Sparkles, X } from "lucide-react";
import { addEventFiles, readTripDocuments, saveTripDetails, type TripDraft } from "@/app/actions";
import { StatefulForm, SubmitButton } from "@/components/Forms";
import { useI18n } from "@/components/I18nProvider";
import type { Day, Flight, Hotel } from "@/lib/trip";

type Props = {
  eventId: string;
  familyId: string;
  ai: boolean;
  current: TripDraft;
};

const ACCEPT = "application/pdf,image/*,.eml,.txt,.html,message/rfc822,text/plain,text/html";

function mimeOf(f: File) {
  if (f.type) return f.type;
  if (f.name.endsWith(".eml")) return "message/rfc822";
  if (f.name.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

/** Ladda upp underlag, låt Claude läsa dem och granska innan det sparas. Eller fyll i för hand. */
export function TripEditor({ eventId, familyId, ai, current }: Props) {
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const { t } = useI18n();

  function upload(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    start(async () => {
      try {
        setStatus(list.length === 1 ? t("Laddar upp {name}…", { name: list[0].name }) : t("Laddar upp {n} filer…", { n: list.length }));
        // Supabase-biblioteket laddas först vid uppladdning, inte med sidan.
        const { browserClient } = await import("@/lib/supabase/client");
        const uploaded = [];
        for (const f of Array.from(list)) {
          const safe = f.name.replace(/[^\w.\-]+/g, "_").slice(-80);
          const path = `${familyId}/${eventId}/${crypto.randomUUID()}-${safe}`;
          const { error: upErr } = await browserClient().storage.from("resor").upload(path, f, { contentType: mimeOf(f) });
          if (upErr) throw new Error(`${f.name}: ${upErr.message}`);
          uploaded.push({ path, name: f.name, mime: mimeOf(f) });
        }
        const ids = await addEventFiles(eventId, uploaded);
        if (!ai) {
          setStatus(t("Uppladdat. Alla i familjen kan öppna dokumenten."));
          return;
        }
        setStatus(t("Claude läser underlagen…"));
        const res = await readTripDocuments(eventId, ids);
        if (res.error) throw new Error(t(res.error));
        setDraft(res.draft!);
        setStatus(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("Det gick inte att ladda upp"));
        setStatus(null);
      }
    });
  }

  if (draft) return <Review draft={draft} eventId={eventId} onClose={() => setDraft(null)} />;

  return (
    <div className="space-y-3">
      <label className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-line px-4 py-6 text-center ${busy ? "opacity-60" : ""}`}>
        <FileUp className="text-accent" size={26} />
        <span className="font-semibold">{t("Ladda upp underlag")}</span>
        <span className="text-[13px] text-muted">
          {ai ? t("PDF, bokningsmejl eller foto på biljetten. Claude fyller i flyg, hotell och program åt dig.") : t("PDF, bokningsmejl eller foto på biljetten.")}
        </span>
        <input type="file" multiple accept={ACCEPT} className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} aria-label={t("Ladda upp underlag")} />
      </label>
      {status && (
        <p className="flex items-center gap-2 text-sm text-muted" role="status">
          {busy && <Sparkles size={15} className="animate-pulse text-accent" />} {status}
        </p>
      )}
      {error && <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">{error}</p>}
      <button type="button" className="text-sm font-medium text-accent" onClick={() => setDraft({ ...current, packingNew: [] })}>
        {t("Fyll i eller ändra för hand")}
      </button>
    </div>
  );
}

const blankFlight = (): Flight => ({ date: null, flight_no: null, from: null, to: null, depart: null, arrive: null, booking_ref: null });
const blankHotel = (): Hotel => ({ name: "", check_in: null, check_out: null, address: null, phone: null });
const blankDay = (): Day => ({ date: null, text: "" });

/** Granskningsformulär. Allt är redigerbart innan det sparas. */
function Review({ draft, eventId, onClose }: { draft: TripDraft; eventId: string; onClose: () => void }) {
  const [trip, setTrip] = useState(draft);
  const { t } = useI18n();
  const set = <K extends keyof TripDraft>(k: K, v: TripDraft[K]) => setTrip((x) => ({ ...x, [k]: v }));
  const v = (s: string | null) => s ?? "";
  const n = (s: string) => (s.trim() === "" ? null : s);
  const editRow = <T,>(list: T[], i: number, patch: Partial<T>) => list.map((r, j) => (j === i ? { ...r, ...patch } : r));
  const payload = JSON.stringify({ ...trip, packingNew: undefined });

  return (
    <StatefulForm action={saveTripDetails} resetOnOk={false}>
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="payload" value={payload} />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("Kolla och spara")}</h3>
        <button type="button" onClick={onClose} className="p-1 text-muted" aria-label={t("Stäng")}><X size={18} /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label" htmlFor="t-title">{t("Resa")}</label>
          <input id="t-title" className="input" value={v(trip.title)} onChange={(e) => set("title", n(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="t-start">{t("Från")}</label>
          <input id="t-start" type="date" className="input" value={v(trip.start_date)} onChange={(e) => set("start_date", n(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="t-end">{t("Till")}</label>
          <input id="t-end" type="date" className="input" value={v(trip.end_date)} onChange={(e) => set("end_date", n(e.target.value))} />
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="t-loc">{t("Plats")}</label>
          <input id="t-loc" className="input" value={v(trip.location)} onChange={(e) => set("location", n(e.target.value))} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={Boolean(trip.booked)} onChange={(e) => set("booked", e.target.checked)} />
        {t("Flyget är bokat")}
      </label>

      <fieldset className="space-y-2">
        <legend className="label">{t("Flyg")}</legend>
        {trip.flights.map((f, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-xl bg-bg p-3">
            <input type="date" className="input py-2 text-sm" aria-label={t("Datum")} value={v(f.date)} onChange={(e) => set("flights", editRow(trip.flights, i, { date: n(e.target.value) }))} />
            <input className="input py-2 text-sm" aria-label={t("Flightnummer")} placeholder={t("Flight")} value={v(f.flight_no)} onChange={(e) => set("flights", editRow(trip.flights, i, { flight_no: n(e.target.value) }))} />
            <input className="input py-2 text-sm" aria-label={t("Avreseort")} placeholder={t("Från")} value={v(f.from)} onChange={(e) => set("flights", editRow(trip.flights, i, { from: n(e.target.value) }))} />
            <input className="input py-2 text-sm" aria-label={t("Ankomstort")} placeholder={t("Till")} value={v(f.to)} onChange={(e) => set("flights", editRow(trip.flights, i, { to: n(e.target.value) }))} />
            <input className="input py-2 text-sm" aria-label={t("Avgång")} placeholder={t("Avgång 14:40")} value={v(f.depart)} onChange={(e) => set("flights", editRow(trip.flights, i, { depart: n(e.target.value) }))} />
            <input className="input py-2 text-sm" aria-label={t("Ankomst")} placeholder={t("Ankomst 19:40")} value={v(f.arrive)} onChange={(e) => set("flights", editRow(trip.flights, i, { arrive: n(e.target.value) }))} />
            <input className="input col-span-2 py-2 text-sm" aria-label={t("Bokningsnummer")} placeholder={t("Bokningsnummer")} value={v(f.booking_ref)} onChange={(e) => set("flights", editRow(trip.flights, i, { booking_ref: n(e.target.value) }))} />
            <button type="button" className="col-span-2 text-left text-sm text-warn" onClick={() => set("flights", trip.flights.filter((_, j) => j !== i))}>{t("Ta bort flyget")}</button>
          </div>
        ))}
        <button type="button" className="flex items-center gap-1 text-sm font-medium text-accent" onClick={() => set("flights", [...trip.flights, blankFlight()])}><Plus size={15} /> {t("Flyg")}</button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="label">{t("Hotell")}</legend>
        {trip.hotels.map((h, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-xl bg-bg p-3">
            <input className="input col-span-2 py-2 text-sm" aria-label={t("Hotell")} placeholder={t("Hotell")} value={h.name} onChange={(e) => set("hotels", editRow(trip.hotels, i, { name: e.target.value }))} />
            <input type="date" className="input py-2 text-sm" aria-label={t("Incheckning")} value={v(h.check_in)} onChange={(e) => set("hotels", editRow(trip.hotels, i, { check_in: n(e.target.value) }))} />
            <input type="date" className="input py-2 text-sm" aria-label={t("Utcheckning")} value={v(h.check_out)} onChange={(e) => set("hotels", editRow(trip.hotels, i, { check_out: n(e.target.value) }))} />
            <input className="input col-span-2 py-2 text-sm" aria-label={t("Adress")} placeholder={t("Adress")} value={v(h.address)} onChange={(e) => set("hotels", editRow(trip.hotels, i, { address: n(e.target.value) }))} />
            <input className="input col-span-2 py-2 text-sm" aria-label={t("Telefon")} placeholder={t("Telefon")} value={v(h.phone)} onChange={(e) => set("hotels", editRow(trip.hotels, i, { phone: n(e.target.value) }))} />
            <button type="button" className="col-span-2 text-left text-sm text-warn" onClick={() => set("hotels", trip.hotels.filter((_, j) => j !== i))}>{t("Ta bort hotellet")}</button>
          </div>
        ))}
        <button type="button" className="flex items-center gap-1 text-sm font-medium text-accent" onClick={() => set("hotels", [...trip.hotels, blankHotel()])}><Plus size={15} /> {t("Hotell")}</button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="label">{t("Program, en rad per dag")}</legend>
        {trip.days.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input className="input min-w-0 flex-1 py-2 text-sm" aria-label={t("Dag {n}", { n: i + 1 })} value={d.text} onChange={(e) => set("days", editRow(trip.days, i, { text: e.target.value }))} />
            <button type="button" className="p-1 text-muted" aria-label={t("Ta bort dag {n}", { n: i + 1 })} onClick={() => set("days", trip.days.filter((_, j) => j !== i))}><X size={15} /></button>
          </div>
        ))}
        <button type="button" className="flex items-center gap-1 text-sm font-medium text-accent" onClick={() => set("days", [...trip.days, blankDay()])}><Plus size={15} /> {t("Dag")}</button>
      </fieldset>

      <div>
        <label className="label" htmlFor="t-important">{t("Viktigt att veta, en sak per rad")}</label>
        <textarea
          id="t-important"
          className="input"
          rows={4}
          value={trip.important.join("\n")}
          onChange={(e) => set("important", e.target.value.split("\n"))}
          onBlur={() => set("important", trip.important.map((s) => s.trim()).filter(Boolean))}
        />
      </div>

      {trip.packingNew.length > 0 && (
        <fieldset>
          <legend className="label">{t("Förslag till packlistan")}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {trip.packingNew.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="pack" value={p} defaultChecked className="size-4 accent-[var(--accent)]" />
                {p}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <SubmitButton>{t("Spara för hela familjen")}</SubmitButton>
    </StatefulForm>
  );
}
