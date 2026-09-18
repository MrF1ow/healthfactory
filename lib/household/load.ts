import { publicSupabaseEnv } from "@/lib/env"
import { deployScreen, type DeployFacts, type DeployScreen } from "@/lib/household/screen"
import { createClient } from "@/lib/supabase/server"

function householdNameFromJoin(households: unknown): string | null {
  if (Array.isArray(households)) {
    const first = households[0]
    if (first && typeof first === "object" && "name" in first && typeof first.name === "string") {
      return first.name
    }
    return null
  }
  if (households && typeof households === "object" && "name" in households) {
    const name = (households as { name: unknown }).name
    return typeof name === "string" ? name : null
  }
  return null
}

export type LoadResult =
  | { ok: true; screen: DeployScreen }
  | { ok: false; error: string }

export async function loadDeployScreen(): Promise<LoadResult> {
  if (!publicSupabaseEnv()) {
    return { ok: true, screen: deployScreen({
      configured: false,
      householdExists: false,
      sessionUserId: null,
      person: null,
    }) }
  }

  try {
    const supabase = await createClient()
    const [{ data: claimsData }, existsResult] = await Promise.all([
      supabase.auth.getClaims(),
      supabase.rpc("household_exists"),
    ])

    if (existsResult.error) {
      return {
        ok: false,
        error: `Could not read household state. Apply the repo migrations to your Supabase project. ${existsResult.error.message}`,
      }
    }

    const sessionUserId =
      typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null

    const facts: DeployFacts = {
      configured: true,
      householdExists: existsResult.data === true,
      sessionUserId,
      person: null,
    }

    if (sessionUserId) {
      const { data: row, error } = await supabase
        .from("people")
        .select("id, name, role, households ( name )")
        .eq("auth_user_id", sessionUserId)
        .maybeSingle()

      if (error) {
        return {
          ok: false,
          error: `Could not load the signed-in person. ${error.message}`,
        }
      }

      if (row) {
        const record = row as {
          id: unknown
          name: unknown
          role: unknown
          households: unknown
        }
        const householdName = householdNameFromJoin(record.households)
        if (
          typeof record.id === "string" &&
          typeof record.name === "string" &&
          (record.role === "owner" || record.role === "member") &&
          typeof householdName === "string"
        ) {
          facts.person = {
            id: record.id,
            name: record.name,
            role: record.role,
            householdName,
          }
        }
      }
    }

    return { ok: true, screen: deployScreen(facts) }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { ok: false, error: `Could not reach Supabase. ${message}` }
  }
}
