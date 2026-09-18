import type { SupabaseClient } from "@supabase/supabase-js"
import { householdConfigFromRow, type HouseholdConfig } from "@/lib/household/config"
import { mealLogFromRow, type MealLogEntry } from "@/lib/household/meal"
import { personProfileFromRow, type PersonProfile } from "@/lib/household/profile"
import type { PersonRole } from "@/lib/household/screen"

export type ReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export type HouseholdMember = {
  id: string
  name: string
  email: string | null
  role: PersonRole
}

export type HouseholdReads = {
  config(): Promise<ReadResult<HouseholdConfig>>
  members(): Promise<ReadResult<HouseholdMember[]>>
  profile(personId: string): Promise<ReadResult<PersonProfile>>
  log(
    personId: string,
    query: { since: string | null; limit: number },
  ): Promise<ReadResult<{ entries: MealLogEntry[]; truncated: boolean }>>
}

const PROFILE_COLUMNS =
  "age, sex, height_cm, weight_kg, activity_level, calories, protein_g, carbs_g, fat_g, macro_method, preferences, bot_config"
const MEAL_COLUMNS = "id, person_id, logged_at, source, payload"

export async function requireHouseholdPerson(
  client: SupabaseClient,
  householdId: string,
  personId: string,
): Promise<ReadResult<string>> {
  const { data, error } = await client
    .from("people")
    .select("id")
    .eq("id", personId)
    .eq("household_id", householdId)
    .maybeSingle()
  if (error) {
    return { ok: false, error: `Could not load person. ${error.message}` }
  }
  if (!data || typeof (data as { id: unknown }).id !== "string") {
    return { ok: false, error: "Not found." }
  }
  return { ok: true, value: (data as { id: string }).id }
}

function parseMember(row: unknown): HouseholdMember | null {
  if (!row || typeof row !== "object") {
    return null
  }
  const record = row as {
    id: unknown
    name: unknown
    email: unknown
    role: unknown
  }
  if (
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    (record.email !== null && typeof record.email !== "string") ||
    (record.role !== "owner" && record.role !== "member")
  ) {
    return null
  }
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
  }
}

export function createHouseholdReads(
  client: SupabaseClient,
  householdId: string,
): HouseholdReads {
  return {
    async config() {
      const { data, error } = await client
        .from("households")
        .select("name, fridge_locations, recipe_search_places, household_preferences")
        .eq("id", householdId)
        .maybeSingle()
      if (error) {
        return {
          ok: false,
          error: `Could not load household settings. ${error.message}`,
        }
      }
      if (!data) {
        return { ok: false, error: "Could not load household settings." }
      }
      return householdConfigFromRow(data)
    },

    async members() {
      const { data, error } = await client
        .from("people")
        .select("id, name, email, role")
        .eq("household_id", householdId)
        .order("created_at")
      if (error) {
        return {
          ok: false,
          error: `Could not load household members. ${error.message}`,
        }
      }
      const people: HouseholdMember[] = []
      for (const row of data ?? []) {
        const member = parseMember(row)
        if (member) {
          people.push(member)
        }
      }
      return { ok: true, value: people }
    },

    async profile(personId: string) {
      const person = await requireHouseholdPerson(client, householdId, personId)
      if (!person.ok) {
        return person
      }
      const { data, error } = await client
        .from("person_profiles")
        .select(PROFILE_COLUMNS)
        .eq("person_id", person.value)
        .maybeSingle()
      if (error) {
        return {
          ok: false,
          error: `Could not load your profile. ${error.message}`,
        }
      }
      if (!data) {
        return { ok: false, error: "Could not load your profile." }
      }
      return personProfileFromRow(data)
    },

    async log(personId, query) {
      const person = await requireHouseholdPerson(client, householdId, personId)
      if (!person.ok) {
        return person
      }
      let request = client
        .from("meal_logs")
        .select(MEAL_COLUMNS)
        .eq("person_id", person.value)
      if (query.since) {
        request = request.gte("logged_at", query.since)
      }
      const { data, error } = await request
        .order("logged_at", { ascending: false })
        .limit(query.limit + 1)
      if (error) {
        return {
          ok: false,
          error: `Could not load meal log. Apply the repo migrations to your Supabase project. ${error.message}`,
        }
      }
      const rows = data ?? []
      const truncated = rows.length > query.limit
      const entries: MealLogEntry[] = []
      for (const row of truncated ? rows.slice(0, query.limit) : rows) {
        const parsed = mealLogFromRow(row)
        if (!parsed.ok) {
          return parsed
        }
        entries.push(parsed.value)
      }
      return { ok: true, value: { entries, truncated } }
    },
  }
}
