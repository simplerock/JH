import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isConfigured, supabaseAnonKey, supabaseJwks, supabaseUrl } from "@/lib/supabase/config";

const PUBLIC = ["/login", "/setup"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Kalenderprenumerationen skyddas av sin hemliga länk, inte av inloggning.
  if (path.startsWith("/api/kalender/")) return NextResponse.next();
  if (!isConfigured) {
    return path === "/setup" ? NextResponse.next() : NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims kontrollerar inloggningen lokalt mot projektets publika nyckel i stället för att fråga
  // Supabase vid varje sidvisning. Nyckeln finns i koden, så inte ens en kall start behöver hämta den.
  // Utgångna sessioner förnyas här.
  const { data } = await supabase.auth.getClaims(undefined, { keys: supabaseJwks });
  const user = data?.claims?.sub ? data.claims : null;
  if (!user && !PUBLIC.includes(path) && !path.startsWith("/api/kalender/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|offline.html|.*\\.(?:png|svg|ico)$).*)"],
};
