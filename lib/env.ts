export function publicSupabaseEnv(): { url: string; publishableKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) {
    return null
  }
  return { url, publishableKey }
}

export function serviceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null
}
