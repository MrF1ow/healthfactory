import type { HouseholdConfig } from "@/lib/household/config"
import {
  sumNutrition,
  type MealLogEntry,
  type MealSource,
} from "@/lib/household/meal"
import type { MacroAmounts, MacroTargets, PersonProfile } from "@/lib/household/profile"
import type { SignedInPerson } from "@/lib/household/screen"
import type { UtcDay } from "@/lib/household/utc-day"

export const HOME_DAY_LOG_LIMIT = 100

export const NUTRIENTS = ["calories", "proteinG", "carbsG", "fatG"] as const
export type Nutrient = (typeof NUTRIENTS)[number]

export const NUTRIENT_LABEL: Record<Nutrient, string> = {
  calories: "Calories",
  proteinG: "Protein (g)",
  carbsG: "Carbs (g)",
  fatG: "Fat (g)",
}

export type DayMealItem =
  | {
      kind: "counted"
      id: string
      description: string
      nutrition: MacroAmounts
      source: MealSource
      loggedAt: string
    }
  | {
      kind: "uncounted"
      id: string
      description: string
      source: MealSource
      loggedAt: string
    }

export type DayMeals =
  | { kind: "empty" }
  | { kind: "complete"; items: readonly [DayMealItem, ...DayMealItem[]] }
  | {
      kind: "truncated"
      items: readonly [DayMealItem, ...DayMealItem[]]
      cap: number
    }

export type NutrientBar =
  | { kind: "zero-target"; logged: number }
  | {
      kind: "ratio"
      logged: number
      target: number
      fraction: number
      remaining: number
    }

export type MacroBars = Record<Nutrient, NutrientBar>

export type DayProgress =
  | {
      kind: "no-targets"
      logged: MacroAmounts
      uncountedMealCount: number
    }
  | {
      kind: "tracking"
      method: MacroTargets["method"]
      bars: MacroBars
      logged: MacroAmounts
      uncountedMealCount: number
    }

export type HouseholdGlance = {
  name: string
  fridgeLocations: readonly string[]
  recipePlaceNames: readonly string[]
  constraints: readonly string[]
}

export type DayBoard = {
  person: SignedInPerson
  day: UtcDay
  progress: DayProgress
  meals: DayMeals
  household: HouseholdGlance
}

export type DayBoardInput = {
  person: SignedInPerson
  day: UtcDay
  profile: PersonProfile
  log: { entries: MealLogEntry[]; truncated: boolean }
  config: HouseholdConfig
}

function dayMealItemFromEntry(entry: MealLogEntry): DayMealItem {
  if (entry.payload.nutrition) {
    return {
      kind: "counted",
      id: entry.id,
      description: entry.payload.description,
      nutrition: entry.payload.nutrition,
      source: entry.source,
      loggedAt: entry.loggedAt,
    }
  }
  return {
    kind: "uncounted",
    id: entry.id,
    description: entry.payload.description,
    source: entry.source,
    loggedAt: entry.loggedAt,
  }
}

export function nutrientBar(logged: number, target: number): NutrientBar {
  if (target === 0) {
    return { kind: "zero-target", logged }
  }
  return {
    kind: "ratio",
    logged,
    target,
    fraction: logged / target,
    remaining: target - logged,
  }
}

export function dayMealsFromLog(
  log: DayBoardInput["log"],
  cap: number,
): DayMeals {
  if (log.entries.length === 0) {
    return { kind: "empty" }
  }
  const items = log.entries.map(dayMealItemFromEntry) as [
    DayMealItem,
    ...DayMealItem[],
  ]
  if (log.truncated) {
    return { kind: "truncated", items, cap }
  }
  return { kind: "complete", items }
}

export function glanceFromConfig(config: HouseholdConfig): HouseholdGlance {
  return {
    name: config.name,
    fridgeLocations: config.fridgeLocations,
    recipePlaceNames: config.recipeSearchPlaces.map((place) => place.name),
    constraints: config.preferences.constraints,
  }
}

function macroBarsFromTargets(
  logged: MacroAmounts,
  targets: MacroAmounts,
): MacroBars {
  return {
    calories: nutrientBar(logged.calories, targets.calories),
    proteinG: nutrientBar(logged.proteinG, targets.proteinG),
    carbsG: nutrientBar(logged.carbsG, targets.carbsG),
    fatG: nutrientBar(logged.fatG, targets.fatG),
  }
}

export function dayBoardFrom(input: DayBoardInput): DayBoard {
  const logged = sumNutrition(input.log.entries)
  const uncountedMealCount = input.log.entries.filter(
    (entry) => entry.payload.nutrition === null,
  ).length
  const meals = dayMealsFromLog(input.log, HOME_DAY_LOG_LIMIT)
  const household = glanceFromConfig(input.config)
  const targets = input.profile.macroTargets

  let progress: DayProgress
  if (!targets) {
    progress = { kind: "no-targets", logged, uncountedMealCount }
  } else {
    progress = {
      kind: "tracking",
      method: targets.method,
      bars: macroBarsFromTargets(logged, targets.amounts),
      logged,
      uncountedMealCount,
    }
  }

  return {
    person: input.person,
    day: input.day,
    progress,
    meals,
    household,
  }
}
