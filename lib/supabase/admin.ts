import { createClient } from "@supabase/supabase-js"
import { publicSupabaseEnv, serviceRoleKey } from "@/lib/env"

export function createAdminClient() {
  const env = publicSupabaseEnv()
  const key = serviceRoleKey()
  if (!env || !key) {
    throw new Error("Supabase service role env is not set.")
  }
  return createClient(env.url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
