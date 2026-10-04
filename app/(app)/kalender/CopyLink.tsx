"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

export function CopyLink({ path }: { path: string }) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  useEffect(() => setUrl(`${window.location.origin}${path}`), [path]);
  return (
    <div className="space-y-2">
      <input className="input font-mono text-xs" readOnly value={url} aria-label={t("Kalenderlänk")} onFocus={(e) => e.target.select()} />
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true), () => setCopied(false))}
        >
          {copied ? t("Kopierad") : t("Kopiera länk")}
        </button>
        <a className="btn-ghost" href={url.replace(/^https?:/, "webcal:")}>{t("Öppna i kalendern")}</a>
      </div>
    </div>
  );
}
