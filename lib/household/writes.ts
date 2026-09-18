import type { SupabaseClient } from "@supabase/supabase-js"
import {
  householdConfigFromRow,
  householdConfigToColumns,
  mergeHouseholdConfig,
  parseFridgeLocationsInput,
  parseHouseholdConfigPatch,
  type HouseholdConfig,
} from "@/lib/household/config"
import {
  mealLogFromRow,
  mealPayloadFromUnknown,
  mealToColumns,
  type MealLogEntry,
  type MealPayload,
  type MealSource,
} from "@/lib/household/meal"
import {
  macroTargetsToColumns,
  mergePreferences,
  parseMacroTargetsFromUnknown,
  parsePreferencesPatch,
  personProfileFromRow,
  personProfileToColumns,
  type MacroTargets,
  type PersonPreferences,
  type PersonProfileDraft,
} from "@/lib/household/profile"
import {
  createHouseholdReads,
  requireHouseholdPerson,
  type ReadResult,
} from "@/lib/household/reads"

export type WriteResult<T> = ReadResult<T>

export type HouseholdActor =
  | { kind: "session"; personId: string }
  | { kind: "service-token" }

const PROFILE_COLUMNS =
  "age, sex, height_cm, weight_kg, activity_level, calories, protein_g, carbs_g, fat_g, macro_method, preferences, bot_config"
const MEAL_COLUMNS = "id, person_id, logged_at, source, payload"

export type HouseholdWrites = {
  replaceConfig(config: HouseholdConfig): Promise<WriteResult<HouseholdConfig>>
  replaceProfile(
    personId: string,
    draft: PersonProfileDraft,
  ): Promise<WriteResult<{ personId: string }>>
  updateMacroTargets(
    personId: string,
    input: unknown,
  ): Promise<WriteResult<MacroTargets | null>>
  updatePreferences(
    personId: string,
    patch: unknown,
  ): Promise<WriteResult<PersonPreferences>>
  logMeal(personId: string, entry: unknown): Promise<WriteResult<MealLogEntry>>
  updateHouseholdConfig(patch: unknown): Promise<WriteResult<HouseholdConfig>>
  updateFridgeLocations(input: unknown): Promise<WriteResult<string[]>>
}

function mealSourceFor(actor: HouseholdActor): MealSource {
  return actor.kind === "session" ? "human" : "bot"
}

export function createHouseholdWrites(
  client: SupabaseClient,
  householdId: string,
  actor: HouseholdActor,
): HouseholdWrites {
  const reads = createHouseholdReads(client, householdId)

  async function requireWritablePerson(personId: string): Promise<WriteResult<string>> {
    if (actor.kind === "session" && actor.personId !== personId) {
      return { ok: false, error: "Not found." }
    }
    return requireHouseholdPerson(client, householdId, personId)
  }

  async function writeConfig(
    config: HouseholdConfig,
  ): Promise<WriteResult<HouseholdConfig>> {
    const columns = householdConfigToColumns(config)
    const { data, error } = await client
      .from("households")
      .update({
        name: columns.name,
        fridge_locations: columns.fridge_locations,
        recipe_search_places: columns.recipe_search_places,
        household_preferences: columns.household_preferences,
      })
      .eq("id", householdId)
      .select("name, fridge_locations, recipe_search_places, household_preferences")
      .maybeSingle()
    if (error) {
      return { ok: false, error: error.message }
    }
    if (!data) {
      return { ok: false, error: "Could not update household settings." }
    }
    return householdConfigFromRow(data)
  }

  return {
    async replaceConfig(config) {
      return writeConfig(config)
    },

    async replaceProfile(personId, draft) {
      const person = await requireWritablePerson(personId)
      if (!person.ok) {
        return person
      }
      const columns = personProfileToColumns(draft)
      const { data, error } = await client
        .from("person_profiles")
        .update(columns)
        .eq("person_id", person.value)
        .select("person_id")
        .maybeSingle()
      if (error) {
        return { ok: false, error: error.message }
      }
      if (!data) {
        return { ok: false, error: "Could not update your profile." }
      }
      return { ok: true, value: { personId: person.value } }
    },

    async updateMacroTargets(personId, input) {
      const person = await requireWritablePerson(personId)
      if (!person.ok) {
        return person
      }
      const parsed = parseMacroTargetsFromUnknown(input)
      if (!parsed.ok) {
        return parsed
      }
      const { data, error } = await client
        .from("person_profiles")
        .update(macroTargetsToColumns(parsed.value))
        .eq("person_id", person.value)
        .select(PROFILE_COLUMNS)
        .maybeSingle()
      if (error) {
        return { ok: false, error: error.message }
      }
      if (!data) {
        return { ok: false, error: "Could not update your profile." }
      }
      const profile = personProfileFromRow(data)
      if (!profile.ok) {
        return profile
      }
      return { ok: true, value: profile.value.macroTargets }
    },

    async updatePreferences(personId, patch) {
      const person = await requireWritablePerson(personId)
      if (!person.ok) {
        return person
      }
      const parsed = parsePreferencesPatch(patch)
      if (!parsed.ok) {
        return parsed
      }
      const current = await reads.profile(person.value)
      if (!current.ok) {
        return current
      }
      const preferences = mergePreferences(current.value.preferences, parsed.value)
      const { data, error } = await client
        .from("person_profiles")
        .update({ preferences })
        .eq("person_id", person.value)
        .select(PROFILE_COLUMNS)
        .maybeSingle()
      if (error) {
        return { ok: false, error: error.message }
      }
      if (!data) {
        return { ok: false, error: "Could not update your profile." }
      }
      const profile = personProfileFromRow(data)
      if (!profile.ok) {
        return profile
      }
      return { ok: true, value: profile.value.preferences }
    },

    async logMeal(personId, entry) {
      const person = await requireWritablePerson(personId)
      if (!person.ok) {
        return person
      }
      const payload = mealPayloadFromUnknown(entry)
      if (!payload.ok) {
        return payload
      }
      return insertMeal(client, person.value, mealSourceFor(actor), payload.value)
    },

    async updateHouseholdConfig(patch) {
      const parsed = parseHouseholdConfigPatch(patch)
      if (!parsed.ok) {
        return parsed
      }
      const current = await reads.config()
      if (!current.ok) {
        return current
      }
      return writeConfig(mergeHouseholdConfig(current.value, parsed.value))
    },

    async updateFridgeLocations(input) {
      const parsed = parseFridgeLocationsInput(input)
      if (!parsed.ok) {
        return parsed
      }
      const current = await reads.config()
      if (!current.ok) {
        return current
      }
      const written = await writeConfig({
        ...current.value,
        fridgeLocations: parsed.value,
      })
      if (!written.ok) {
        return written
      }
      return { ok: true, value: written.value.fridgeLocations }
    },
  }
}

async function insertMeal(
  client: SupabaseClient,
  personId: string,
  source: MealSource,
  payload: MealPayload,
): Promise<WriteResult<MealLogEntry>> {
  const { data, error } = await client
    .from("meal_logs")
    .insert(mealToColumns(personId, source, payload))
    .select(MEAL_COLUMNS)
    .maybeSingle()
  if (error) {
    return { ok: false, error: error.message }
  }
  if (!data) {
    return { ok: false, error: "Could not log that meal." }
  }
  return mealLogFromRow(data)
}
