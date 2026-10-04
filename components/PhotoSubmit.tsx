"use client";

import { useRef, useState, useTransition } from "react";
import { submitCompletion } from "@/app/actions";
import { browserClient } from "@/lib/supabase/client";
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
        const { error: upErr } = await browserClient().storage.from("bevis").upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const form = new FormData();
        form.set("id", taskId);
        form.set("recurrence", recurrence);
        form.set("photo_path", path);
        await submitCompletion(form);
      } catch (e) {
        setError(e instanceof Error ? t(e.message) : t("Det gick inte att skicka fotot"));
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
      {error && <span className="sr-only" role="alert">{error}</span>}
      {pending && <span className="sr-only" role="status">{redo ? t("Skickar igen") : t("Skickar")}</span>}
    </>
  );
}
