import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { publicSupabaseEnv } from "@/lib/env"

export async function createClient() {
  const env = publicSupabaseEnv()
  if (!env) {
    throw new Error("Supabase public env is not set.")
  }

  const cookieStore = await cookies()

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Proxy refreshes the session. Server Components cannot write cookies.
        }
      },
    },
  })
}
