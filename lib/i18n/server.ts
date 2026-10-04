import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { isLang, makeI18n, type Lang } from "./index";

/** Språket från cookien. Svenska om inget är valt. */
export const getLang = cache(async (): Promise<Lang> => {
  const v = (await cookies()).get("lang")?.value;
  return isLang(v) ? v : "sv";
});

export const getI18n = cache(async () => makeI18n(await getLang()));
