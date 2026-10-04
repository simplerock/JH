export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** Bara synliga ASCII-tecken. Fångar en nyckel som kopierats i maskerad form (•••) eller med mellanslag. */
const plain = (v: string) => /^[\x21-\x7e]+$/.test(v);

function problems(): string[] {
  const out: string[] = [];
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabaseUrl) && !/^https?:\/\/localhost(:\d+)?$/.test(supabaseUrl)) {
    out.push("NEXT_PUBLIC_SUPABASE_URL ska vara projektets adress, t.ex. https://abc.supabase.co");
  }
  if (!plain(supabaseAnonKey) || supabaseAnonKey.length < 30) {
    out.push("NEXT_PUBLIC_SUPABASE_ANON_KEY saknas eller innehåller maskerade tecken (•). Kopiera hela nyckeln igen.");
  }
  // Den hemliga nyckeln finns bara på servern.
  if (typeof window === "undefined") {
    const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
    if (service && (!plain(service) || service.length < 30)) {
      out.push("SUPABASE_SERVICE_ROLE_KEY innehåller maskerade tecken (•). Tryck Reveal i Supabase och kopiera med kopieringsikonen.");
    }
  }
  return out;
}

export const configProblems = problems();
export const isConfigured = configProblems.length === 0;

/** Barn har inga e-postadresser. Användarnamnet mappas till en intern adress som aldrig får post. */
export const CHILD_EMAIL_DOMAIN = process.env.CHILD_EMAIL_DOMAIN ?? "barn.familjen.app";

export function childEmail(username: string): string {
  return `${username.toLowerCase()}@${CHILD_EMAIL_DOMAIN}`;
}

/** Supabase kräver minst 6 tecken. PIN-koden fylls ut så att även 4 siffror fungerar. */
export function childPassword(pin: string): string {
  return `pin:${pin}:familjen`;
}
