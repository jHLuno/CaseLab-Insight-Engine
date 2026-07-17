"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/server/database/types";
import { getSupabasePublicEnvironment } from "./env";

export function createBrowserSupabaseClient() {
  const { publishableKey, url } = getSupabasePublicEnvironment();

  return createBrowserClient<Database>(url, publishableKey);
}
