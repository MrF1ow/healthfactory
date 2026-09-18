"use server"

import { redirect } from "next/navigation"
import { authEmailForLogin } from "@/lib/household/login"
import { parseMemberInput } from "@/lib/household/parse"
import { publicSupabaseEnv, serviceRoleKey } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type MemberFormState = { error: string | null }

function alreadyRegistered(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes("already been registered") || lower.includes("already registered")
}

function friendlyMemberError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("already in use")) {
    return "That login is already in use."
  }
  if (lower.includes("not a household member")) {
    return "You must be a household member to add people."
  }
  return message
}

export async function createMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  if (!publicSupabaseEnv() || !serviceRoleKey()) {
    return {
      error:
        "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    }
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const sessionUserId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null
  if (!sessionUserId) {
    return { error: "Sign in to add a household member." }
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
    return { error: "You must be a household member to add people." }
  }

  const parsed = parseMemberInput(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const admin = createAdminClient()
  const created = await admin.auth.admin.createUser({
    email: authEmailForLogin(parsed.value.login),
    password: parsed.value.password,
    email_confirm: true,
  })

  if (created.error) {
    if (alreadyRegistered(created.error.message)) {
      return { error: "That login is already in use." }
    }
    return { error: created.error.message }
  }

  const authUserId = created.data.user?.id
  if (!authUserId) {
    return { error: "Could not create the login." }
  }

  const pEmail = parsed.value.login.kind === "email" ? parsed.value.login.email : ""
  const added = await supabase.rpc("add_household_member", {
    p_auth_user_id: authUserId,
    p_name: parsed.value.name,
    p_email: pEmail,
  })

  if (added.error || !added.data) {
    await admin.auth.admin.deleteUser(authUserId)
    return {
      error: added.error
        ? friendlyMemberError(added.error.message)
        : "Could not add the household member.",
    }
  }

  redirect("/settings")
}
