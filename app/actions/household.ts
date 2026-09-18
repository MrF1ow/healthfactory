"use server"

import { redirect } from "next/navigation"
import { parseHouseholdConfig } from "@/lib/household/parse"
import { createHouseholdWrites } from "@/lib/household/writes"
import { publicSupabaseEnv } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"

export type HouseholdFormState = { error: string | null }

export async function updateHousehold(
  _prev: HouseholdFormState,
  formData: FormData,
): Promise<HouseholdFormState> {
  if (!publicSupabaseEnv()) {
    return {
      error: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    }
  }

  const parsed = parseHouseholdConfig(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const sessionUserId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null
  if (!sessionUserId) {
    return { error: "Sign in to update household settings." }
  }

  const { data: personRow, error: personError } = await supabase
    .from("people")
    .select("id, household_id")
    .eq("auth_user_id", sessionUserId)
    .maybeSingle()

  if (personError) {
    return { error: `Could not load the signed-in person. ${personError.message}` }
  }
  if (!personRow) {
    return { error: "You must be a household member to update settings." }
  }

  const personId = (personRow as { id: unknown }).id
  const householdId = (personRow as { household_id: unknown }).household_id
  if (typeof personId !== "string" || typeof householdId !== "string") {
    return { error: "Could not load household settings." }
  }

  const written = await createHouseholdWrites(supabase, householdId, {
    kind: "session",
    personId,
  }).replaceConfig(parsed.value)
  if (!written.ok) {
    return { error: written.error }
  }

  redirect("/settings")
}
