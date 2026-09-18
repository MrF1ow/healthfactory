export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export const SEX_VALUES = ["female", "male", "other"] as const
export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const
export const CHECK_IN_CADENCES = ["off", "daily", "weekly"] as const

export type Sex = (typeof SEX_VALUES)[number]
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]
export type CheckInCadence = (typeof CHECK_IN_CADENCES)[number]

export type MacroAmounts = {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export type MacroTargets =
  | { method: "manual"; amounts: MacroAmounts }
  | { method: "calculated"; amounts: MacroAmounts }

export type PersonPreferences = {
  schemaVersion: 1
  dietaryRestrictions: string[]
  allergies: string[]
  likes: string[]
  dislikes: string[]
  notes: string | null
}

export type BotConfig = {
  schemaVersion: 1
  checkInCadence: CheckInCadence
  guidance: string | null
}

export type PersonProfile = {
  ageYears: number | null
  sex: Sex | null
  heightCm: number | null
  weightKg: number | null
  activityLevel: ActivityLevel | null
  macroTargets: MacroTargets | null
  preferences: PersonPreferences
  botConfig: BotConfig
}

export type PersonProfileDraft = {
  ageYears: number | null
  sex: Sex | null
  heightCm: number | null
  weightKg: number | null
  activityLevel: ActivityLevel | null
  macroTargets: { method: "manual"; amounts: MacroAmounts } | null
  preferences: PersonPreferences
  botConfig: BotConfig
}

export type PersonProfileRow = {
  age: unknown
  sex: unknown
  height_cm: unknown
  weight_kg: unknown
  activity_level: unknown
  calories: unknown
  protein_g: unknown
  carbs_g: unknown
  fat_g: unknown
  macro_method: unknown
  preferences: unknown
  bot_config: unknown
}

export type PersonProfileColumns = {
  age: number | null
  sex: Sex | null
  height_cm: number | null
  weight_kg: number | null
  activity_level: ActivityLevel | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  macro_method: "manual" | null
  preferences: PersonPreferences
  bot_config: BotConfig
}

export const EMPTY_PREFERENCES: PersonPreferences = {
  schemaVersion: 1,
  dietaryRestrictions: [],
  allergies: [],
  likes: [],
  dislikes: [],
  notes: null,
}

export const DEFAULT_BOT_CONFIG: BotConfig = {
  schemaVersion: 1,
  checkInCadence: "off",
  guidance: null,
}

export function isSex(value: string): value is Sex {
  return (SEX_VALUES as readonly string[]).includes(value)
}

export function isActivityLevel(value: string): value is ActivityLevel {
  return (ACTIVITY_LEVELS as readonly string[]).includes(value)
}

export function isCheckInCadence(value: string): value is CheckInCadence {
  return (CHECK_IN_CADENCES as readonly string[]).includes(value)
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
    const trimmed = item.trim()
    if (trimmed) {
      items.push(trimmed)
    }
  }
  return items
}

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function parseOptionalNumber(
  raw: string,
  label: string,
): ParseResult<number | null> {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: true, value: null }
  }
  const value = Number(trimmed)
  if (!Number.isFinite(value)) {
    return { ok: false, error: `Enter a valid ${label}.` }
  }
  return { ok: true, value }
}

export function parseNonNegativeNumber(
  raw: string,
  label: string,
): ParseResult<number | null> {
  const parsed = parseOptionalNumber(raw, label)
  if (!parsed.ok) {
    return parsed
  }
  if (parsed.value !== null && parsed.value < 0) {
    return { ok: false, error: "Macro targets cannot be negative." }
  }
  return parsed
}

export function parsePositiveNumber(
  raw: string,
  label: string,
): ParseResult<number | null> {
  const parsed = parseOptionalNumber(raw, label)
  if (!parsed.ok) {
    return parsed
  }
  if (parsed.value !== null && parsed.value <= 0) {
    return { ok: false, error: `Enter a ${label} greater than zero.` }
  }
  return parsed
}

export function parseMacroAmountsFromOptionals(
  calories: number | null,
  proteinG: number | null,
  carbsG: number | null,
  fatG: number | null,
): ParseResult<MacroAmounts | null> {
  const values = [calories, proteinG, carbsG, fatG]
  const present = values.filter((value) => value !== null)
  if (present.length === 0) {
    return { ok: true, value: null }
  }
  if (present.length !== 4 || values.some((value) => value === null)) {
    return { ok: false, error: "Enter calories, protein, carbs, and fat together." }
  }
  return {
    ok: true,
    value: {
      calories: calories as number,
      proteinG: proteinG as number,
      carbsG: carbsG as number,
      fatG: fatG as number,
    },
  }
}

function asFiniteNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

export function parseNonNegativeUnknown(
  value: unknown,
  label: string,
): ParseResult<number | null> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null }
  }
  const parsed = asFiniteNumber(value)
  if (parsed === undefined) {
    return { ok: false, error: `Enter a valid ${label}.` }
  }
  if (parsed === null) {
    return { ok: true, value: null }
  }
  if (parsed < 0) {
    return { ok: false, error: "Macro targets cannot be negative." }
  }
  return { ok: true, value: parsed }
}

export function parseMacroTargetsFromUnknown(
  value: unknown,
): ParseResult<MacroTargets | null> {
  if (value === null) {
    return { ok: true, value: null }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Enter calories, protein, carbs, and fat together." }
  }
  const record = value as {
    calories?: unknown
    proteinG?: unknown
    carbsG?: unknown
    fatG?: unknown
    method?: unknown
  }
  const calories = parseNonNegativeUnknown(record.calories, "calories")
  if (!calories.ok) {
    return calories
  }
  const proteinG = parseNonNegativeUnknown(record.proteinG, "protein")
  if (!proteinG.ok) {
    return proteinG
  }
  const carbsG = parseNonNegativeUnknown(record.carbsG, "carbs")
  if (!carbsG.ok) {
    return carbsG
  }
  const fatG = parseNonNegativeUnknown(record.fatG, "fat")
  if (!fatG.ok) {
    return fatG
  }
  const amounts = parseMacroAmountsFromOptionals(
    calories.value,
    proteinG.value,
    carbsG.value,
    fatG.value,
  )
  if (!amounts.ok) {
    return amounts
  }
  if (!amounts.value) {
    if (record.method !== undefined && record.method !== null) {
      return { ok: false, error: "Enter calories, protein, carbs, and fat together." }
    }
    return { ok: true, value: null }
  }
  let method: MacroTargets["method"] = "manual"
  if (record.method !== undefined && record.method !== null) {
    if (record.method !== "manual" && record.method !== "calculated") {
      return { ok: false, error: "Unknown macro method." }
    }
    method = record.method
  }
  return { ok: true, value: { method, amounts: amounts.value } }
}

export type PersonPreferencesPatch = {
  dietaryRestrictions?: string[]
  allergies?: string[]
  likes?: string[]
  dislikes?: string[]
  notes?: string | null
}

export function parsePreferencesPatch(
  value: unknown,
): ParseResult<PersonPreferencesPatch> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Preferences must be an object." }
  }
  const record = value as {
    dietaryRestrictions?: unknown
    allergies?: unknown
    likes?: unknown
    dislikes?: unknown
    notes?: unknown
  }
  const patch: PersonPreferencesPatch = {}
  if (record.dietaryRestrictions !== undefined) {
    const items = asStringArray(record.dietaryRestrictions)
    if (!items) {
      return { ok: false, error: "Preferences must use lists of text." }
    }
    patch.dietaryRestrictions = items
  }
  if (record.allergies !== undefined) {
    const items = asStringArray(record.allergies)
    if (!items) {
      return { ok: false, error: "Preferences must use lists of text." }
    }
    patch.allergies = items
  }
  if (record.likes !== undefined) {
    const items = asStringArray(record.likes)
    if (!items) {
      return { ok: false, error: "Preferences must use lists of text." }
    }
    patch.likes = items
  }
  if (record.dislikes !== undefined) {
    const items = asStringArray(record.dislikes)
    if (!items) {
      return { ok: false, error: "Preferences must use lists of text." }
    }
    patch.dislikes = items
  }
  if (record.notes !== undefined) {
    const notes = optionalText(record.notes)
    if (notes === undefined) {
      return { ok: false, error: "Preferences must use lists of text." }
    }
    patch.notes = notes
  }
  return { ok: true, value: patch }
}

export function mergePreferences(
  current: PersonPreferences,
  patch: PersonPreferencesPatch,
): PersonPreferences {
  return {
    schemaVersion: 1,
    dietaryRestrictions: patch.dietaryRestrictions ?? current.dietaryRestrictions,
    allergies: patch.allergies ?? current.allergies,
    likes: patch.likes ?? current.likes,
    dislikes: patch.dislikes ?? current.dislikes,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
  }
}

export type MacroTargetColumns = {
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  macro_method: "manual" | "calculated" | null
}

export function macroTargetsToColumns(
  targets: MacroTargets | null,
): MacroTargetColumns {
  if (!targets) {
    return {
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      macro_method: null,
    }
  }
  return {
    calories: targets.amounts.calories,
    protein_g: targets.amounts.proteinG,
    carbs_g: targets.amounts.carbsG,
    fat_g: targets.amounts.fatG,
    macro_method: targets.method,
  }
}

export function preferencesFromUnknown(value: unknown): ParseResult<PersonPreferences> {
  if (value === null || value === undefined) {
    return { ok: true, value: EMPTY_PREFERENCES }
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Preferences must be an object." }
  }
  const record = value as {
    dietaryRestrictions?: unknown
    allergies?: unknown
    likes?: unknown
    dislikes?: unknown
    notes?: unknown
  }
  const dietaryRestrictions =
    record.dietaryRestrictions === undefined
      ? []
      : asStringArray(record.dietaryRestrictions)
  const allergies =
    record.allergies === undefined ? [] : asStringArray(record.allergies)
  const likes = record.likes === undefined ? [] : asStringArray(record.likes)
  const dislikes =
    record.dislikes === undefined ? [] : asStringArray(record.dislikes)
  const notes = optionalText(record.notes)
  if (!dietaryRestrictions || !allergies || !likes || !dislikes || notes === undefined) {
    return { ok: false, error: "Preferences must use lists of text." }
  }
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      dietaryRestrictions,
      allergies,
      likes,
      dislikes,
      notes,
    },
  }
}

function botConfigFromUnknown(value: unknown): ParseResult<BotConfig> {
  if (value === null || value === undefined) {
    return { ok: true, value: DEFAULT_BOT_CONFIG }
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Bot settings must be an object." }
  }
  const record = value as { checkInCadence?: unknown; guidance?: unknown }
  const cadenceRaw =
    record.checkInCadence === undefined || record.checkInCadence === null
      ? "off"
      : record.checkInCadence
  if (typeof cadenceRaw !== "string" || !isCheckInCadence(cadenceRaw)) {
    return { ok: false, error: "Unknown check-in cadence." }
  }
  const guidance = optionalText(record.guidance)
  if (guidance === undefined) {
    return { ok: false, error: "Bot guidance must be text." }
  }
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      checkInCadence: cadenceRaw,
      guidance,
    },
  }
}

export function personProfileFromRow(row: PersonProfileRow): ParseResult<PersonProfile> {
  const ageYears = asFiniteNumber(row.age)
  const heightCm = asFiniteNumber(row.height_cm)
  const weightKg = asFiniteNumber(row.weight_kg)
  const calories = asFiniteNumber(row.calories)
  const proteinG = asFiniteNumber(row.protein_g)
  const carbsG = asFiniteNumber(row.carbs_g)
  const fatG = asFiniteNumber(row.fat_g)
  if (
    ageYears === undefined ||
    heightCm === undefined ||
    weightKg === undefined ||
    calories === undefined ||
    proteinG === undefined ||
    carbsG === undefined ||
    fatG === undefined
  ) {
    return { ok: false, error: "Profile numbers must be numeric." }
  }

  let sex: Sex | null = null
  if (row.sex !== null && row.sex !== undefined && row.sex !== "") {
    if (typeof row.sex !== "string" || !isSex(row.sex)) {
      return { ok: false, error: "Unknown sex." }
    }
    sex = row.sex
  }

  let activityLevel: ActivityLevel | null = null
  if (
    row.activity_level !== null &&
    row.activity_level !== undefined &&
    row.activity_level !== ""
  ) {
    if (typeof row.activity_level !== "string" || !isActivityLevel(row.activity_level)) {
      return { ok: false, error: "Unknown activity level." }
    }
    activityLevel = row.activity_level
  }

  const amounts = parseMacroAmountsFromOptionals(calories, proteinG, carbsG, fatG)
  if (!amounts.ok) {
    return amounts
  }

  let macroTargets: MacroTargets | null = null
  if (amounts.value) {
    if (row.macro_method !== "manual" && row.macro_method !== "calculated") {
      return { ok: false, error: "Unknown macro method." }
    }
    macroTargets = { method: row.macro_method, amounts: amounts.value }
  } else if (row.macro_method !== null && row.macro_method !== undefined) {
    return { ok: false, error: "Enter calories, protein, carbs, and fat together." }
  }

  const preferences = preferencesFromUnknown(row.preferences)
  if (!preferences.ok) {
    return preferences
  }
  const botConfig = botConfigFromUnknown(row.bot_config)
  if (!botConfig.ok) {
    return botConfig
  }

  return {
    ok: true,
    value: {
      ageYears,
      sex,
      heightCm,
      weightKg,
      activityLevel,
      macroTargets,
      preferences: preferences.value,
      botConfig: botConfig.value,
    },
  }
}

export function personProfileToColumns(draft: PersonProfileDraft): PersonProfileColumns {
  const amounts = draft.macroTargets?.amounts
  return {
    age: draft.ageYears,
    sex: draft.sex,
    height_cm: draft.heightCm,
    weight_kg: draft.weightKg,
    activity_level: draft.activityLevel,
    calories: amounts?.calories ?? null,
    protein_g: amounts?.proteinG ?? null,
    carbs_g: amounts?.carbsG ?? null,
    fat_g: amounts?.fatG ?? null,
    macro_method: amounts ? "manual" : null,
    preferences: draft.preferences,
    bot_config: draft.botConfig,
  }
}
