"use server"

import { redirect } from "next/navigation"
import { publicSupabaseEnv } from "@/lib/env"
import { parseProfileInput } from "@/lib/household/parse"
import { personProfileToColumns } from "@/lib/household/profile"
import { createClient } from "@/lib/supabase/server"

export type ProfileFormState = { error: string | null }

export async function updateMyProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  if (!publicSupabaseEnv()) {
    return {
      error: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    }
  }

  const parsed = parseProfileInput(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const sessionUserId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null
  if (!sessionUserId) {
    return { error: "Sign in to update your profile." }
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
    return { error: "You must be a household member to edit a profile." }
  }

  const personId = (personRow as { id: unknown }).id
  if (typeof personId !== "string") {
    return { error: "Could not load the signed-in person." }
  }

  const columns = personProfileToColumns(parsed.value)
  const { data: updated, error } = await supabase
    .from("person_profiles")
    .update(columns)
    .eq("person_id", personId)
    .select("person_id")
    .maybeSingle()

  if (error) {
    return { error: error.message }
  }
  if (!updated) {
    return { error: "Could not update your profile." }
  }

  redirect("/profile")
}
