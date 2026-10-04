"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Hämtar om sidan när appen kommer tillbaka från bakgrunden efter en stund.
 * Hemskärmsappen laddas sällan om av sig själv, och en förälder ska se nya inskick utan att göra något.
 */
export function RefreshOnFocus({ after = 30_000 }: { after?: number }) {
  const router = useRouter();
  useEffect(() => {
    let hiddenAt = 0;
    const onChange = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > after) router.refresh();
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [router, after]);
  return null;
}
