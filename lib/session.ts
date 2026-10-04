import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Family, Profile } from "./types";

/** Inloggad användare utan krav på familj. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

/** Inloggad användare med familj. Skickar till onboarding om familj saknas. */
export const getSession = cache(async () => {
  const { supabase, user } = await getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  if (!profile) redirect("/onboarding");
  const { data: family } = await supabase.from("families").select("*").eq("id", profile.family_id).single<Family>();
  if (!family) redirect("/onboarding");
  return { supabase, user, profile, family, isParent: profile.role === "parent" };
});

export async function requireParent() {
  const session = await getSession();
  if (!session.isParent) throw new Error("Bara föräldrar kan göra det här");
  return session;
}
