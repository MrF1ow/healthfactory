"use server"

import { redirect } from "next/navigation"
import { householdConfigToColumns } from "@/lib/household/config"
import { parseHouseholdConfig } from "@/lib/household/parse"
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
    .select("household_id")
    .eq("auth_user_id", sessionUserId)
    .maybeSingle()

  if (personError) {
    return { error: `Could not load the signed-in person. ${personError.message}` }
  }
  if (!personRow) {
    return { error: "You must be a household member to update settings." }
  }

  const householdId = (personRow as { household_id: unknown }).household_id
  if (typeof householdId !== "string") {
    return { error: "Could not load household settings." }
  }

  const columns = householdConfigToColumns(parsed.value)
  const { data: updated, error } = await supabase
    .from("households")
    .update({
      name: columns.name,
      fridge_locations: columns.fridge_locations,
      recipe_search_places: columns.recipe_search_places,
      household_preferences: columns.household_preferences,
    })
    .eq("id", householdId)
    .select("id")
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!updated) {
    return { error: "Could not update household settings." }
  }

  redirect("/settings")
}
