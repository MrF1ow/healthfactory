import {
  parseMacroAmountsFromOptionals,
  type MacroAmounts,
  type ParseResult,
} from "./profile"

export type MealSource = "human" | "bot"

export type MealPayload = {
  schemaVersion: 1
  kind: "meal"
  description: string
  nutrition: MacroAmounts | null
}

export type HumanMealDraft = {
  payload: MealPayload
}

export type MealLogEntry = {
  id: string
  personId: string
  loggedAt: string
  source: MealSource
  payload: MealPayload
}

export type MealLogRow = {
  id: unknown
  person_id: unknown
  logged_at: unknown
  source: unknown
  payload: unknown
}

export type HumanMealColumns = {
  person_id: string
  source: "human"
  payload: MealPayload
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

function mealPayloadFromUnknown(value: unknown): ParseResult<MealPayload> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Enter what you ate." }
  }
  const record = value as {
    description?: unknown
    nutrition?: unknown
  }
  if (typeof record.description !== "string" || !record.description.trim()) {
    return { ok: false, error: "Enter what you ate." }
  }

  let nutrition: MacroAmounts | null = null
  if (record.nutrition !== null && record.nutrition !== undefined) {
    if (typeof record.nutrition !== "object" || Array.isArray(record.nutrition)) {
      return { ok: false, error: "Enter calories, protein, carbs, and fat together." }
    }
    const macros = record.nutrition as {
      calories?: unknown
      proteinG?: unknown
      carbsG?: unknown
      fatG?: unknown
    }
    const calories = asFiniteNumber(macros.calories)
    const proteinG = asFiniteNumber(macros.proteinG)
    const carbsG = asFiniteNumber(macros.carbsG)
    const fatG = asFiniteNumber(macros.fatG)
    if (
      calories === undefined ||
      proteinG === undefined ||
      carbsG === undefined ||
      fatG === undefined
    ) {
      return { ok: false, error: "Meal nutrition must be numeric." }
    }
    const amounts = parseMacroAmountsFromOptionals(calories, proteinG, carbsG, fatG)
    if (!amounts.ok) {
      return amounts
    }
    if (!amounts.value) {
      return { ok: false, error: "Enter calories, protein, carbs, and fat together." }
    }
    nutrition = amounts.value
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      kind: "meal",
      description: record.description.trim(),
      nutrition,
    },
  }
}

export function mealLogFromRow(row: MealLogRow): ParseResult<MealLogEntry> {
  if (typeof row.id !== "string" || !row.id) {
    return { ok: false, error: "Could not load the meal log." }
  }
  if (typeof row.person_id !== "string" || !row.person_id) {
    return { ok: false, error: "Could not load the meal log." }
  }
  if (typeof row.logged_at !== "string" || !row.logged_at) {
    return { ok: false, error: "Could not load the meal log." }
  }
  if (row.source !== "human" && row.source !== "bot") {
    return { ok: false, error: "Unknown meal source." }
  }
  const payload = mealPayloadFromUnknown(row.payload)
  if (!payload.ok) {
    return payload
  }
  return {
    ok: true,
    value: {
      id: row.id,
      personId: row.person_id,
      loggedAt: row.logged_at,
      source: row.source,
      payload: payload.value,
    },
  }
}

export function humanMealToColumns(
  personId: string,
  draft: HumanMealDraft,
): HumanMealColumns {
  return {
    person_id: personId,
    source: "human",
    payload: draft.payload,
  }
}
