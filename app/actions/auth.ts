"use server"

import { redirect } from "next/navigation"
import {
  parseBootstrapInput,
  parseOwnerNames,
  parseSignInInput,
} from "@/lib/household/parse"
import { authEmailForLogin } from "@/lib/household/login"
import { publicSupabaseEnv, serviceRoleKey } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type AuthFormState = { error: string | null }

function alreadyRegistered(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes("already been registered") || lower.includes("already registered")
}

function friendlyBootstrapError(message: string): string {
  if (message.toLowerCase().includes("household already exists")) {
    return "This household is already set up. Sign in instead."
  }
  return message
}

export async function bootstrapHousehold(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!publicSupabaseEnv() || !serviceRoleKey()) {
    return {
      error:
        "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    }
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const signedIn = typeof claimsData?.claims?.sub === "string"

  if (!signedIn) {
    const parsed = parseBootstrapInput(formData)
    if (!parsed.ok) {
      return { error: parsed.error }
    }

    const admin = createAdminClient()
    const created = await admin.auth.admin.createUser({
      email: parsed.value.email,
      password: parsed.value.password,
      email_confirm: true,
    })

    if (created.error && !alreadyRegistered(created.error.message)) {
      return { error: created.error.message }
    }

    const session = await supabase.auth.signInWithPassword({
      email: parsed.value.email,
      password: parsed.value.password,
    })

    if (session.error) {
      return { error: session.error.message }
    }

    const boot = await supabase.rpc("bootstrap_household", {
      p_household_name: parsed.value.householdName,
      p_person_name: parsed.value.personName,
    })

    if (boot.error) {
      return { error: friendlyBootstrapError(boot.error.message) }
    }

    redirect("/")
  }

  const names = parseOwnerNames(formData)
  if (!names.ok) {
    return { error: names.error }
  }

  const boot = await supabase.rpc("bootstrap_household", {
    p_household_name: names.value.householdName,
    p_person_name: names.value.personName,
  })

  if (boot.error) {
    return { error: friendlyBootstrapError(boot.error.message) }
  }

  redirect("/")
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseSignInInput(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  if (!publicSupabaseEnv()) {
    return {
      error: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    }
  }

  const supabase = await createClient()
  const session = await supabase.auth.signInWithPassword({
    email: authEmailForLogin(parsed.value.login),
    password: parsed.value.password,
  })

  if (session.error) {
    return { error: session.error.message }
  }

  redirect("/")
}

export async function signOut(): Promise<void> {
  if (!publicSupabaseEnv()) {
    redirect("/")
  }
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
