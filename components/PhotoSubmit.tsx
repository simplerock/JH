"use client";

import { useRef, useState, useTransition } from "react";
import { submitCompletion } from "@/app/actions";
import { useI18n } from "./I18nProvider";

/** Skalar ner bilden i webbläsaren så att uppladdningen går snabbt även på mobilnät. */
async function shrink(file: File, max = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Kunde inte läsa bilden"))), "image/jpeg", 0.8));
}

type Props = { taskId: string; recurrence: string; familyId: string; title: string; redo?: boolean };

/** Knappen för en syssla som kräver foto: öppnar kameran, laddar upp och skickar in. */
export function PhotoSubmit({ taskId, recurrence, familyId, title, redo }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    start(async () => {
      try {
        const blob = await shrink(file);
        const path = `${familyId}/${crypto.randomUUID()}.jpg`;
        // Supabase-biblioteket laddas först när någon faktiskt skickar ett foto. Sidorna blir lättare.
        const { browserClient } = await import("@/lib/supabase/client");
        const { error: upErr } = await browserClient().storage.from("bevis").upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const form = new FormData();
        form.set("id", taskId);
        form.set("recurrence", recurrence);
        form.set("photo_path", path);
        await submitCompletion(form);
      } catch (e) {
        // Barnet ska alltid få veta att det inte gick, annars tror det att sysslan är inskickad.
        console.error("Fotot kunde inte skickas", e);
        setError(t("Fotot kom inte fram. Försök igen, och säg till mamma eller pappa om det inte går."));
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label={t("Ta foto och skicka {title}", { title })}
        className={`flex size-[26px] items-center justify-center rounded-full border-2 border-line text-muted transition active:scale-90 ${pending ? "animate-pulse" : ""}`}
      >
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-photo-for={taskId}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {error && (
        <div role="alert" className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-warn-soft p-4 text-sm text-warn shadow-lg">
          <p className="flex-1">{error}</p>
          <button type="button" className="font-semibold" onClick={() => { setError(null); input.current?.click(); }}>
            {t("Försök igen")}
          </button>
          <button type="button" aria-label={t("Stäng")} className="font-semibold" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}
      {pending && <span className="sr-only" role="status">{redo ? t("Skickar igen") : t("Skickar")}</span>}
    </>
  );
}
