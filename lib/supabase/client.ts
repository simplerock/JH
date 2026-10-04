"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Supabase i webbläsaren. Används för att ladda upp filer direkt till Storage. */
export function browserClient() {
  client ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
