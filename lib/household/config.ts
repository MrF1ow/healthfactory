type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export const RECIPE_PLACE_TYPES = [
  "grocery",
  "recipe_site",
  "meal_kit",
  "other",
] as const

export type RecipePlaceType = (typeof RECIPE_PLACE_TYPES)[number]

export type RecipeSearchPlace = {
  name: string
  type: RecipePlaceType
  url: string | null
}

export type HouseholdPreferences = {
  constraints: string[]
  budget: string | null
  shoppingCadence: string | null
}

export type HouseholdConfig = {
  name: string
  fridgeLocations: string[]
  recipeSearchPlaces: RecipeSearchPlace[]
  preferences: HouseholdPreferences
}

export type HouseholdColumns = {
  name: string
  fridge_locations: string[]
  recipe_search_places: RecipeSearchPlace[]
  household_preferences: HouseholdPreferences
}

export function isRecipePlaceType(value: string): value is RecipePlaceType {
  return (RECIPE_PLACE_TYPES as readonly string[]).includes(value)
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const items: string[] = []
  for (const item of value) {
    if (typeof item !== "string") {
      return null
    }
    items.push(item)
  }
  return items
}

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseRecipePlace(value: unknown): ParseResult<RecipeSearchPlace> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Unknown recipe place type." }
  }
  const record = value as { name?: unknown; type?: unknown; url?: unknown }
  if (typeof record.name !== "string" || !record.name.trim()) {
    return { ok: false, error: "Unknown recipe place type." }
  }
  if (typeof record.type !== "string" || !isRecipePlaceType(record.type)) {
    return { ok: false, error: "Unknown recipe place type." }
  }
  let url: string | null = null
  if (record.url !== undefined && record.url !== null) {
    if (typeof record.url !== "string") {
      return { ok: false, error: "Unknown recipe place type." }
    }
    url = record.url.trim() ? record.url.trim() : null
  }
  return {
    ok: true,
    value: {
      name: record.name.trim(),
      type: record.type,
      url,
    },
  }
}

export function householdConfigFromRow(row: {
  name: unknown
  fridge_locations: unknown
  recipe_search_places: unknown
  household_preferences: unknown
}): ParseResult<HouseholdConfig> {
  if (typeof row.name !== "string" || !row.name.trim()) {
    return { ok: false, error: "Enter a household name." }
  }

  const fridgeLocations = asStringArray(row.fridge_locations)
  if (!fridgeLocations) {
    return { ok: false, error: "Fridge locations must be a list of names." }
  }

  if (!Array.isArray(row.recipe_search_places)) {
    return { ok: false, error: "Unknown recipe place type." }
  }

  const recipeSearchPlaces: RecipeSearchPlace[] = []
  for (const item of row.recipe_search_places) {
    const parsed = parseRecipePlace(item)
    if (!parsed.ok) {
      return parsed
    }
    recipeSearchPlaces.push(parsed.value)
  }

  const prefsRaw =
    row.household_preferences === null || row.household_preferences === undefined
      ? {}
      : row.household_preferences
  if (!prefsRaw || typeof prefsRaw !== "object" || Array.isArray(prefsRaw)) {
    return { ok: false, error: "Household preferences must be an object." }
  }
  const prefs = prefsRaw as {
    constraints?: unknown
    budget?: unknown
    shoppingCadence?: unknown
  }
  const constraints =
    prefs.constraints === undefined ? [] : asStringArray(prefs.constraints)
  if (!constraints) {
    return { ok: false, error: "Constraints must be a list of names." }
  }
  const budget = prefs.budget === undefined ? null : optionalText(prefs.budget)
  const shoppingCadence =
    prefs.shoppingCadence === undefined
      ? null
      : optionalText(prefs.shoppingCadence)
  if (budget === undefined || shoppingCadence === undefined) {
    return { ok: false, error: "Budget and shopping cadence must be text." }
  }

  return {
    ok: true,
    value: {
      name: row.name.trim(),
      fridgeLocations,
      recipeSearchPlaces,
      preferences: {
        constraints,
        budget,
        shoppingCadence,
      },
    },
  }
}

export function householdConfigToColumns(config: HouseholdConfig): HouseholdColumns {
  return {
    name: config.name,
    fridge_locations: config.fridgeLocations,
    recipe_search_places: config.recipeSearchPlaces,
    household_preferences: config.preferences,
  }
}

export type HouseholdPreferencesPatch = {
  constraints?: string[]
  budget?: string | null
  shoppingCadence?: string | null
}

export type HouseholdConfigPatch = {
  name?: string
  fridgeLocations?: string[]
  recipeSearchPlaces?: RecipeSearchPlace[]
  preferences?: HouseholdPreferencesPatch
}

function parseNameList(value: unknown, error: string): ParseResult<string[]> {
  if (!Array.isArray(value)) {
    return { ok: false, error }
  }
  const items: string[] = []
  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, error }
    }
    const trimmed = item.trim()
    if (trimmed) {
      items.push(trimmed)
    }
  }
  return { ok: true, value: items }
}

export function parseFridgeLocationsInput(value: unknown): ParseResult<string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Fridge locations must be a list of names." }
  }
  const record = value as { locations?: unknown }
  return parseNameList(
    record.locations,
    "Fridge locations must be a list of names.",
  )
}

function parseHouseholdPreferencesPatch(
  value: unknown,
): ParseResult<HouseholdPreferencesPatch> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Household preferences must be an object." }
  }
  const prefs = value as {
    constraints?: unknown
    budget?: unknown
    shoppingCadence?: unknown
  }
  const patch: HouseholdPreferencesPatch = {}
  if (prefs.constraints !== undefined) {
    const constraints = parseNameList(
      prefs.constraints,
      "Constraints must be a list of names.",
    )
    if (!constraints.ok) {
      return constraints
    }
    patch.constraints = constraints.value
  }
  if (prefs.budget !== undefined) {
    const budget = optionalText(prefs.budget)
    if (budget === undefined) {
      return { ok: false, error: "Budget and shopping cadence must be text." }
    }
    patch.budget = budget
  }
  if (prefs.shoppingCadence !== undefined) {
    const shoppingCadence = optionalText(prefs.shoppingCadence)
    if (shoppingCadence === undefined) {
      return { ok: false, error: "Budget and shopping cadence must be text." }
    }
    patch.shoppingCadence = shoppingCadence
  }
  return { ok: true, value: patch }
}

export function parseHouseholdConfigPatch(
  value: unknown,
): ParseResult<HouseholdConfigPatch> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Household config must be an object." }
  }
  const record = value as {
    name?: unknown
    fridgeLocations?: unknown
    recipeSearchPlaces?: unknown
    preferences?: unknown
  }
  const patch: HouseholdConfigPatch = {}
  if (record.name !== undefined) {
    if (typeof record.name !== "string" || !record.name.trim()) {
      return { ok: false, error: "Enter a household name." }
    }
    patch.name = record.name.trim()
  }
  if (record.fridgeLocations !== undefined) {
    const fridgeLocations = parseNameList(
      record.fridgeLocations,
      "Fridge locations must be a list of names.",
    )
    if (!fridgeLocations.ok) {
      return fridgeLocations
    }
    patch.fridgeLocations = fridgeLocations.value
  }
  if (record.recipeSearchPlaces !== undefined) {
    if (!Array.isArray(record.recipeSearchPlaces)) {
      return { ok: false, error: "Unknown recipe place type." }
    }
    const recipeSearchPlaces: RecipeSearchPlace[] = []
    for (const item of record.recipeSearchPlaces) {
      const parsed = parseRecipePlace(item)
      if (!parsed.ok) {
        return parsed
      }
      recipeSearchPlaces.push(parsed.value)
    }
    patch.recipeSearchPlaces = recipeSearchPlaces
  }
  if (record.preferences !== undefined) {
    const preferences = parseHouseholdPreferencesPatch(record.preferences)
    if (!preferences.ok) {
      return preferences
    }
    patch.preferences = preferences.value
  }
  return { ok: true, value: patch }
}

export function mergeHouseholdConfig(
  current: HouseholdConfig,
  patch: HouseholdConfigPatch,
): HouseholdConfig {
  return {
    name: patch.name ?? current.name,
    fridgeLocations: patch.fridgeLocations ?? current.fridgeLocations,
    recipeSearchPlaces: patch.recipeSearchPlaces ?? current.recipeSearchPlaces,
    preferences: {
      constraints: patch.preferences?.constraints ?? current.preferences.constraints,
      budget:
        patch.preferences?.budget !== undefined
          ? patch.preferences.budget
          : current.preferences.budget,
      shoppingCadence:
        patch.preferences?.shoppingCadence !== undefined
          ? patch.preferences.shoppingCadence
          : current.preferences.shoppingCadence,
    },
  }
}
