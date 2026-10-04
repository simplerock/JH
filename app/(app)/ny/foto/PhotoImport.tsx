"use client";

import { useState, useTransition } from "react";
import { Camera, Sparkles } from "lucide-react";
import { readEventsFromInput, saveFoundEvents } from "@/app/actions";
import { StatefulForm, SubmitButton } from "@/components/Forms";
import { useI18n } from "@/components/I18nProvider";
import type { FoundEvent } from "@/lib/events-import";

async function shrink(file: File, max = 2000): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob: Blob = await new Promise((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error("Kunde inte läsa bilden"))), "image/jpeg", 0.85));
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

/** Fota eller ladda upp en lapp, eller klistra in ett mejl. Granska och spara till kalendern. */
export function PhotoImport() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [found, setFound] = useState<(FoundEvent & { keep: boolean })[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const { t } = useI18n();

  function read() {
    setError(null);
    start(async () => {
      const form = new FormData();
      for (const f of files) form.append("file", await shrink(f));
      form.set("text", text);
      const res = await readEventsFromInput(form);
      if (res.error) setError(t(res.error));
      else setFound(res.events!.map((e) => ({ ...e, keep: true })));
    });
  }

  if (found) {
    const edit = (i: number, patch: Partial<FoundEvent & { keep: boolean }>) => setFound(found.map((e, j) => (j === i ? { ...e, ...patch } : e)));
    const chosen = found.filter((e) => e.keep).map((e) => ({ ...e, keep: undefined }));
    return (
      <StatefulForm action={saveFoundEvents} resetOnOk={false}>
        <input type="hidden" name="payload" value={JSON.stringify(chosen)} />
        <p className="text-sm text-muted">{found.length === 1 ? t("Claude hittade 1 händelse. Kolla och ändra innan du sparar.") : t("Claude hittade {n} händelser. Kolla och ändra innan du sparar.", { n: found.length })}</p>
        <div className="group">
          {found.map((e, i) => (
            <div key={i} className="flex gap-3 py-3">
              <input
                type="checkbox"
                checked={e.keep}
                onChange={(x) => edit(i, { keep: x.target.checked })}
                className="mt-2.5 size-5 shrink-0 accent-[var(--accent)]"
                aria-label={t("Ta med {title}", { title: e.title })}
              />
              <div className={`min-w-0 flex-1 space-y-2 ${e.keep ? "" : "opacity-50"}`}>
                <input className="input py-2" value={e.title} onChange={(x) => edit(i, { title: x.target.value })} aria-label={t("Titel")} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="input py-2 text-sm" value={e.date} onChange={(x) => edit(i, { date: x.target.value })} aria-label={t("Datum")} />
                  <input className="input py-2 text-sm" value={e.time ?? ""} placeholder={t("Tid")} onChange={(x) => edit(i, { time: x.target.value || null })} aria-label={t("Tid")} />
                </div>
                {e.notes && <p className="text-[13px] text-muted">{e.notes}</p>}
              </div>
            </div>
          ))}
        </div>
        <SubmitButton>{chosen.length === 1 ? t("Lägg in 1 händelse") : t("Lägg in {n} händelser", { n: chosen.length })}</SubmitButton>
        <button type="button" className="text-sm text-muted" onClick={() => setFound(null)}>{t("Börja om")}</button>
      </StatefulForm>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-line bg-card px-4 py-8 text-center">
        <Camera className="text-accent" size={28} />
        <span className="font-semibold">{files.length ? files.map((f) => f.name).join(", ") : t("Fota eller välj fil")}</span>
        <span className="text-[13px] text-muted">{t("Skolbrev, träningsschema, inbjudan. Bild eller PDF.")}</span>
        <input type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} aria-label={t("Fota eller välj fil")} />
      </label>
      <div>
        <label className="label" htmlFor="paste">{t("Eller klistra in ett mejl")}</label>
        <textarea id="paste" className="input" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {error && <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">{error}</p>}
      <button type="button" className="btn w-full" disabled={busy || (!files.length && !text.trim())} onClick={read}>
        {busy ? <><Sparkles size={16} className="animate-pulse" /> {t("Claude läser…")}</> : t("Hitta datum")}
      </button>
    </div>
  );
}
