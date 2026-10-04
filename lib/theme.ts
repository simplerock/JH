import "server-only";
import { cookies } from "next/headers";

export type Theme = "light" | "dark" | "system";

/** Valt utseende från cookien. "system" följer telefonens inställning. */
export async function getTheme(): Promise<Theme> {
  const v = (await cookies()).get("theme")?.value;
  return v === "light" || v === "dark" ? v : "system";
}
