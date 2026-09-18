"use server"

import { redirect } from "next/navigation"
import { publicSupabaseEnv } from "@/lib/env"
import { humanMealToColumns } from "@/lib/household/meal"
import { parseMealInput } from "@/lib/household/parse"
import { createClient } from "@/lib/supabase/server"

export type MealFormState = { error: string | null }

export async function logMyMeal(
  _prev: MealFormState,
  formData: FormData,
): Promise<MealFormState> {
  if (!publicSupabaseEnv()) {
    return {
      error: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    }
  }

  const parsed = parseMealInput(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const sessionUserId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null
  if (!sessionUserId) {
    return { error: "Sign in to log a meal." }
  }

  const { data: personRow, error: personError } = await supabase
    .from("people")
    .select("id")
    .eq("auth_user_id", sessionUserId)
    .maybeSingle()

  if (personError) {
    return { error: `Could not load the signed-in person. ${personError.message}` }
  }
  if (!personRow) {
    return { error: "You must be a household member to log a meal." }
  }

  const personId = (personRow as { id: unknown }).id
  if (typeof personId !== "string") {
    return { error: "Could not load the signed-in person." }
  }

  const { data: inserted, error } = await supabase
    .from("meal_logs")
    .insert(humanMealToColumns(personId, parsed.value))
    .select("id")
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!inserted) {
    return { error: "Could not log that meal." }
  }

  redirect("/")
}
