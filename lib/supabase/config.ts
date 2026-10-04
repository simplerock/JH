export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Barn har inga e-postadresser. Användarnamnet mappas till en intern adress som aldrig får post. */
export const CHILD_EMAIL_DOMAIN = process.env.CHILD_EMAIL_DOMAIN ?? "barn.familjen.app";

export function childEmail(username: string): string {
  return `${username.toLowerCase()}@${CHILD_EMAIL_DOMAIN}`;
}

/** Supabase kräver minst 6 tecken. PIN-koden fylls ut så att även 4 siffror fungerar. */
export function childPassword(pin: string): string {
  return `pin:${pin}:familjen`;
}
