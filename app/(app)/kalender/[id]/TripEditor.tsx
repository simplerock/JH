"use client";

import { useState, useTransition } from "react";
import { FileUp, Plus, Sparkles, X } from "lucide-react";
import { addEventFiles, readTripDocuments, saveTripDetails, type TripDraft } from "@/app/actions";
import { StatefulForm, SubmitButton } from "@/components/Forms";
import { browserClient } from "@/lib/supabase/client";
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

  function upload(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    start(async () => {
      try {
        setStatus(`Laddar upp ${list.length === 1 ? list[0].name : `${list.length} filer`}…`);
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
          setStatus("Uppladdat. Alla i familjen kan öppna dokumenten.");
          return;
        }
        setStatus("Claude läser underlagen…");
        const res = await readTripDocuments(eventId, ids);
        if (res.error) throw new Error(res.error);
        setDraft(res.draft!);
        setStatus(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Det gick inte att ladda upp");
        setStatus(null);
      }
    });
  }

  if (draft) return <Review draft={draft} eventId={eventId} onClose={() => setDraft(null)} />;

  return (
    <div className="space-y-3">
      <label className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-line px-4 py-6 text-center ${busy ? "opacity-60" : ""}`}>
        <FileUp className="text-accent" size={26} />
        <span className="font-semibold">Ladda upp underlag</span>
        <span className="text-[13px] text-muted">
          {ai ? "PDF, bokningsmejl eller foto på biljetten. Claude fyller i flyg, hotell och program åt dig." : "PDF, bokningsmejl eller foto på biljetten."}
        </span>
        <input type="file" multiple accept={ACCEPT} className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} aria-label="Ladda upp underlag" />
      </label>
      {status && (
        <p className="flex items-center gap-2 text-sm text-muted" role="status">
          {busy && <Sparkles size={15} className="animate-pulse text-accent" />} {status}
        </p>
      )}
      {error && <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">{error}</p>}
      <button type="button" className="text-sm font-medium text-accent" onClick={() => setDraft({ ...current, packingNew: [] })}>
        Fyll i eller ändra för hand
      </button>
    </div>
  );
}

const blankFlight = (): Flight => ({ date: null, flight_no: null, from: null, to: null, depart: null, arrive: null, booking_ref: null });
const blankHotel = (): Hotel => ({ name: "", check_in: null, check_out: null, address: null, phone: null });
const blankDay = (): Day => ({ date: null, text: "" });

/** Granskningsformulär. Allt är redigerbart innan det sparas. */
function Review({ draft, eventId, onClose }: { draft: TripDraft; eventId: string; onClose: () => void }) {
  const [t, setT] = useState(draft);
  const set = <K extends keyof TripDraft>(k: K, v: TripDraft[K]) => setT((x) => ({ ...x, [k]: v }));
  const v = (s: string | null) => s ?? "";
  const n = (s: string) => (s.trim() === "" ? null : s);
  const editRow = <T,>(list: T[], i: number, patch: Partial<T>) => list.map((r, j) => (j === i ? { ...r, ...patch } : r));
  const payload = JSON.stringify({ ...t, packingNew: undefined });

  return (
    <StatefulForm action={saveTripDetails} resetOnOk={false}>
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="payload" value={payload} />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Kolla och spara</h3>
        <button type="button" onClick={onClose} className="p-1 text-muted" aria-label="Stäng"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label" htmlFor="t-title">Resa</label>
          <input id="t-title" className="input" value={v(t.title)} onChange={(e) => set("title", n(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="t-start">Från</label>
          <input id="t-start" type="date" className="input" value={v(t.start_date)} onChange={(e) => set("start_date", n(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="t-end">Till</label>
          <input id="t-end" type="date" className="input" value={v(t.end_date)} onChange={(e) => set("end_date", n(e.target.value))} />
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="t-loc">Plats</label>
          <input id="t-loc" className="input" value={v(t.location)} onChange={(e) => set("location", n(e.target.value))} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={Boolean(t.booked)} onChange={(e) => set("booked", e.target.checked)} />
        Flyget är bokat
      </label>

      <fieldset className="space-y-2">
        <legend className="label">Flyg</legend>
        {t.flights.map((f, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-xl bg-bg p-3">
            <input type="date" className="input py-2 text-sm" aria-label="Datum" value={v(f.date)} onChange={(e) => set("flights", editRow(t.flights, i, { date: n(e.target.value) }))} />
            <input className="input py-2 text-sm" aria-label="Flightnummer" placeholder="Flight" value={v(f.flight_no)} onChange={(e) => set("flights", editRow(t.flights, i, { flight_no: n(e.target.value) }))} />
            <input className="input py-2 text-sm" aria-label="Avreseort" placeholder="Från" value={v(f.from)} onChange={(e) => set("flights", editRow(t.flights, i, { from: n(e.target.value) }))} />
            <input className="input py-2 text-sm" aria-label="Ankomstort" placeholder="Till" value={v(f.to)} onChange={(e) => set("flights", editRow(t.flights, i, { to: n(e.target.value) }))} />
            <input className="input py-2 text-sm" aria-label="Avgång" placeholder="Avgång 14:40" value={v(f.depart)} onChange={(e) => set("flights", editRow(t.flights, i, { depart: n(e.target.value) }))} />
            <input className="input py-2 text-sm" aria-label="Ankomst" placeholder="Ankomst 19:40" value={v(f.arrive)} onChange={(e) => set("flights", editRow(t.flights, i, { arrive: n(e.target.value) }))} />
            <input className="input col-span-2 py-2 text-sm" aria-label="Bokningsnummer" placeholder="Bokningsnummer" value={v(f.booking_ref)} onChange={(e) => set("flights", editRow(t.flights, i, { booking_ref: n(e.target.value) }))} />
            <button type="button" className="col-span-2 text-left text-sm text-warn" onClick={() => set("flights", t.flights.filter((_, j) => j !== i))}>Ta bort flyget</button>
          </div>
        ))}
        <button type="button" className="flex items-center gap-1 text-sm font-medium text-accent" onClick={() => set("flights", [...t.flights, blankFlight()])}><Plus size={15} /> Flyg</button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="label">Hotell</legend>
        {t.hotels.map((h, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-xl bg-bg p-3">
            <input className="input col-span-2 py-2 text-sm" aria-label="Hotell" placeholder="Hotell" value={h.name} onChange={(e) => set("hotels", editRow(t.hotels, i, { name: e.target.value }))} />
            <input type="date" className="input py-2 text-sm" aria-label="Incheckning" value={v(h.check_in)} onChange={(e) => set("hotels", editRow(t.hotels, i, { check_in: n(e.target.value) }))} />
            <input type="date" className="input py-2 text-sm" aria-label="Utcheckning" value={v(h.check_out)} onChange={(e) => set("hotels", editRow(t.hotels, i, { check_out: n(e.target.value) }))} />
            <input className="input col-span-2 py-2 text-sm" aria-label="Adress" placeholder="Adress" value={v(h.address)} onChange={(e) => set("hotels", editRow(t.hotels, i, { address: n(e.target.value) }))} />
            <input className="input col-span-2 py-2 text-sm" aria-label="Telefon" placeholder="Telefon" value={v(h.phone)} onChange={(e) => set("hotels", editRow(t.hotels, i, { phone: n(e.target.value) }))} />
            <button type="button" className="col-span-2 text-left text-sm text-warn" onClick={() => set("hotels", t.hotels.filter((_, j) => j !== i))}>Ta bort hotellet</button>
          </div>
        ))}
        <button type="button" className="flex items-center gap-1 text-sm font-medium text-accent" onClick={() => set("hotels", [...t.hotels, blankHotel()])}><Plus size={15} /> Hotell</button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="label">Program, en rad per dag</legend>
        {t.days.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input className="input min-w-0 flex-1 py-2 text-sm" aria-label={`Dag ${i + 1}`} value={d.text} onChange={(e) => set("days", editRow(t.days, i, { text: e.target.value }))} />
            <button type="button" className="p-1 text-muted" aria-label={`Ta bort dag ${i + 1}`} onClick={() => set("days", t.days.filter((_, j) => j !== i))}><X size={15} /></button>
          </div>
        ))}
        <button type="button" className="flex items-center gap-1 text-sm font-medium text-accent" onClick={() => set("days", [...t.days, blankDay()])}><Plus size={15} /> Dag</button>
      </fieldset>

      <div>
        <label className="label" htmlFor="t-important">Viktigt att veta, en sak per rad</label>
        <textarea
          id="t-important"
          className="input"
          rows={4}
          value={t.important.join("\n")}
          onChange={(e) => set("important", e.target.value.split("\n"))}
          onBlur={() => set("important", t.important.map((s) => s.trim()).filter(Boolean))}
        />
      </div>

      {t.packingNew.length > 0 && (
        <fieldset>
          <legend className="label">Förslag till packlistan</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {t.packingNew.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="pack" value={p} defaultChecked className="size-4 accent-[var(--accent)]" />
                {p}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <SubmitButton>Spara för hela familjen</SubmitButton>
    </StatefulForm>
  );
}
