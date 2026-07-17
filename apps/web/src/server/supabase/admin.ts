import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/server/database/types";
import {
  getSupabasePublicEnvironment,
  getSupabaseServiceRoleKey
} from "./env";

export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicEnvironment();

  return createClient<Database>(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}
