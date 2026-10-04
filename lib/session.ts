import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Family, Profile } from "./types";

/**
 * Inloggad användare utan krav på familj. Inloggningen kontrolleras lokalt med getClaims
 * (signaturen verifieras mot projektets publika nyckel), så det kostar ingen rundresa till Supabase.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/login");
  return { supabase, user: { id } };
});

/** Inloggad användare med familj. Skickar till onboarding om familj saknas. */
export const getSession = cache(async () => {
  const { supabase, user } = await getUser();
  // Profil och familj i samma fråga: varje rundresa till databasen märks i laddtiden.
  const { data } = await supabase.from("profiles").select("*, family:families(*)").eq("id", user.id).maybeSingle<Profile & { family: Family | null }>();
  if (!data?.family) redirect("/onboarding");
  const { family, ...profile } = data;
  return { supabase, user, profile: profile as Profile, family, isParent: profile.role === "parent" };
});

export async function requireParent() {
  const session = await getSession();
  if (!session.isParent) throw new Error("Bara föräldrar kan göra det här");
  return session;
}
