import { createBrowserClient } from "@supabase/ssr"
import { publicSupabaseEnv } from "@/lib/env"

export function createClient() {
  const env = publicSupabaseEnv()
  if (!env) {
    throw new Error("Supabase public env is not set.")
  }
  return createBrowserClient(env.url, env.publishableKey)
}
