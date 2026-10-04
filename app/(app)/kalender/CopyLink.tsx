"use client";

import { useEffect, useState } from "react";

export function CopyLink({ path }: { path: string }) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(`${window.location.origin}${path}`), [path]);
  return (
    <div className="space-y-2">
      <input className="input font-mono text-xs" readOnly value={url} aria-label="Kalenderlänk" onFocus={(e) => e.target.select()} />
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true), () => setCopied(false))}
        >
          {copied ? "Kopierad" : "Kopiera länk"}
        </button>
        <a className="btn-ghost" href={url.replace(/^https?:/, "webcal:")}>Öppna i kalendern</a>
      </div>
    </div>
  );
}
