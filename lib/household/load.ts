import { publicSupabaseEnv } from "@/lib/env"
import { householdConfigFromRow, type HouseholdConfig } from "@/lib/household/config"
import { mealLogFromRow, type MealLogEntry } from "@/lib/household/meal"
import {
  personProfileFromRow,
  type PersonProfile,
} from "@/lib/household/profile"
import { deployScreen, type DeployFacts, type DeployScreen, type PersonRole, type SignedInPerson } from "@/lib/household/screen"
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

export type HouseholdMember = {
  id: string
  name: string
  email: string | null
  role: PersonRole
}

export type HouseholdSettings = {
  person: SignedInPerson
  config: HouseholdConfig
  people: HouseholdMember[]
}

export type SettingsLoadResult =
  | { ok: true; settings: HouseholdSettings }
  | { ok: false; kind: "redirect" }
  | { ok: false; kind: "error"; error: string }

export async function loadHouseholdSettings(): Promise<SettingsLoadResult> {
  if (!publicSupabaseEnv()) {
    return { ok: false, kind: "redirect" }
  }

  try {
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const sessionUserId =
      typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null
    if (!sessionUserId) {
      return { ok: false, kind: "redirect" }
    }

    const { data: personRow, error: personError } = await supabase
      .from("people")
      .select("id, name, role, household_id, households ( name )")
      .eq("auth_user_id", sessionUserId)
      .maybeSingle()

    if (personError) {
      return {
        ok: false,
        kind: "error",
        error: `Could not load the signed-in person. ${personError.message}`,
      }
    }
    if (!personRow) {
      return { ok: false, kind: "redirect" }
    }

    const personRecord = personRow as {
      id: unknown
      name: unknown
      role: unknown
      household_id: unknown
      households: unknown
    }
    const householdName = householdNameFromJoin(personRecord.households)
    if (
      typeof personRecord.id !== "string" ||
      typeof personRecord.name !== "string" ||
      (personRecord.role !== "owner" && personRecord.role !== "member") ||
      typeof personRecord.household_id !== "string" ||
      typeof householdName !== "string"
    ) {
      return { ok: false, kind: "redirect" }
    }

    const { data: householdRow, error: householdError } = await supabase
      .from("households")
      .select("name, fridge_locations, recipe_search_places, household_preferences")
      .eq("id", personRecord.household_id)
      .maybeSingle()

    if (householdError) {
      return {
        ok: false,
        kind: "error",
        error: `Could not load household settings. ${householdError.message}`,
      }
    }
    if (!householdRow) {
      return {
        ok: false,
        kind: "error",
        error: "Could not load household settings.",
      }
    }

    const config = householdConfigFromRow(householdRow)
    if (!config.ok) {
      return { ok: false, kind: "error", error: config.error }
    }

    const { data: peopleRows, error: peopleError } = await supabase
      .from("people")
      .select("id, name, email, role")
      .eq("household_id", personRecord.household_id)
      .order("created_at")

    if (peopleError) {
      return {
        ok: false,
        kind: "error",
        error: `Could not load household members. ${peopleError.message}`,
      }
    }

    const people: HouseholdMember[] = []
    for (const row of peopleRows ?? []) {
      const record = row as {
        id: unknown
        name: unknown
        email: unknown
        role: unknown
      }
      if (
        typeof record.id === "string" &&
        typeof record.name === "string" &&
        (record.email === null || typeof record.email === "string") &&
        (record.role === "owner" || record.role === "member")
      ) {
        people.push({
          id: record.id,
          name: record.name,
          email: record.email,
          role: record.role,
        })
      }
    }

    return {
      ok: true,
      settings: {
        person: {
          id: personRecord.id,
          name: personRecord.name,
          role: personRecord.role,
          householdName,
        },
        config: config.value,
        people,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { ok: false, kind: "error", error: `Could not reach Supabase. ${message}` }
  }
}

export type ProfilePage = {
  person: SignedInPerson
  profile: PersonProfile
}

export type ProfileLoadResult =
  | { ok: true; page: ProfilePage }
  | { ok: false; kind: "redirect" }
  | { ok: false; kind: "error"; error: string }

export async function loadMyProfile(): Promise<ProfileLoadResult> {
  if (!publicSupabaseEnv()) {
    return { ok: false, kind: "redirect" }
  }

  try {
    const supabase = await createClient()
    const { data: claimsData } = await supabase.auth.getClaims()
    const sessionUserId =
      typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null
    if (!sessionUserId) {
      return { ok: false, kind: "redirect" }
    }

    const { data: personRow, error: personError } = await supabase
      .from("people")
      .select("id, name, role, households ( name )")
      .eq("auth_user_id", sessionUserId)
      .maybeSingle()

    if (personError) {
      return {
        ok: false,
        kind: "error",
        error: `Could not load the signed-in person. ${personError.message}`,
      }
    }
    if (!personRow) {
      return { ok: false, kind: "redirect" }
    }

    const personRecord = personRow as {
      id: unknown
      name: unknown
      role: unknown
      households: unknown
    }
    const householdName = householdNameFromJoin(personRecord.households)
    if (
      typeof personRecord.id !== "string" ||
      typeof personRecord.name !== "string" ||
      (personRecord.role !== "owner" && personRecord.role !== "member") ||
      typeof householdName !== "string"
    ) {
      return { ok: false, kind: "redirect" }
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("person_profiles")
      .select(
        "age, sex, height_cm, weight_kg, activity_level, calories, protein_g, carbs_g, fat_g, macro_method, preferences, bot_config",
      )
      .eq("person_id", personRecord.id)
      .maybeSingle()

    if (profileError) {
      return {
        ok: false,
        kind: "error",
        error: `Could not load your profile. ${profileError.message}`,
      }
    }
    if (!profileRow) {
      return {
        ok: false,
        kind: "error",
        error: "Could not load your profile.",
      }
    }

    const profile = personProfileFromRow(profileRow)
    if (!profile.ok) {
      return { ok: false, kind: "error", error: profile.error }
    }

    return {
      ok: true,
      page: {
        person: {
          id: personRecord.id,
          name: personRecord.name,
          role: personRecord.role,
          householdName,
        },
        profile: profile.value,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { ok: false, kind: "error", error: `Could not reach Supabase. ${message}` }
  }
}

export type RecentMealsResult =
  | { ok: true; meals: MealLogEntry[] }
  | { ok: false; error: string }

export async function loadRecentMeals(personId: string): Promise<RecentMealsResult> {
  if (!publicSupabaseEnv()) {
    return { ok: true, meals: [] }
  }

  try {
    const supabase = await createClient()
    const { data: rows, error } = await supabase
      .from("meal_logs")
      .select("id, person_id, logged_at, source, payload")
      .eq("person_id", personId)
      .order("logged_at", { ascending: false })
      .limit(10)

    if (error) {
      return {
        ok: false,
        error: `Could not load meal log. Apply the repo migrations to your Supabase project. ${error.message}`,
      }
    }

    const meals: MealLogEntry[] = []
    for (const row of rows ?? []) {
      const parsed = mealLogFromRow(row)
      if (!parsed.ok) {
        return { ok: false, error: parsed.error }
      }
      meals.push(parsed.value)
    }
    return { ok: true, meals }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { ok: false, error: `Could not reach Supabase. ${message}` }
  }
}
