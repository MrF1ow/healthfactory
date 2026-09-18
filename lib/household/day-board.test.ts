import { describe, expect, it } from "vitest"
import { dayBoardFrom, HOME_DAY_LOG_LIMIT } from "./day-board"
import type { MealLogEntry } from "./meal"
import type { PersonProfile } from "./profile"
import type { SignedInPerson } from "./screen"
import { utcDayFromInstant } from "./utc-day"
import type { HouseholdConfig } from "./config"

const person: SignedInPerson = {
  id: "p1",
  name: "Ethan",
  role: "owner",
  householdName: "The Flow House",
}

const day = utcDayFromInstant(new Date("2026-09-18T15:04:00.000Z"))

const mealWithNutrition: MealLogEntry = {
  id: "m1",
  personId: "p1",
  loggedAt: "2026-09-18T12:00:00.000Z",
  source: "human",
  payload: {
    schemaVersion: 1,
    kind: "meal",
    description: "Chicken and rice",
    nutrition: { calories: 700, proteinG: 50, carbsG: 60, fatG: 20 },
  },
}

const mealDescriptionOnly: MealLogEntry = {
  id: "m2",
  personId: "p1",
  loggedAt: "2026-09-18T08:00:00.000Z",
  source: "bot",
  payload: {
    schemaVersion: 1,
    kind: "meal",
    description: "Oatmeal",
    nutrition: null,
  },
}

const emptyHouseConfig: HouseholdConfig = {
  name: "The Flow House",
  fridgeLocations: [],
  recipeSearchPlaces: [],
  preferences: { constraints: [], budget: null, shoppingCadence: null },
}

const stubProfile: PersonProfile = {
  ageYears: null,
  sex: null,
  heightCm: null,
  weightKg: null,
  activityLevel: null,
  macroTargets: null,
  preferences: {
    schemaVersion: 1,
    dietaryRestrictions: [],
    allergies: [],
    likes: [],
    dislikes: [],
    notes: null,
  },
  botConfig: { schemaVersion: 1, checkInCadence: "off", guidance: null },
}

describe("dayBoardFrom", () => {
  it("projects no-targets with counted and uncounted meals", () => {
    const board = dayBoardFrom({
      person,
      day,
      profile: { ...stubProfile, macroTargets: null },
      log: { entries: [mealWithNutrition, mealDescriptionOnly], truncated: false },
      config: emptyHouseConfig,
    })
    expect(board.progress.kind).toBe("no-targets")
    expect(board.meals.kind).toBe("complete")
    expect(board.progress.logged.calories).toBe(700)
    expect(board.progress.uncountedMealCount).toBe(1)
  })

  it("projects tracking with ratio bars when targets are set", () => {
    const board = dayBoardFrom({
      person,
      day,
      profile: {
        ...stubProfile,
        macroTargets: {
          method: "manual",
          amounts: { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 },
        },
      },
      log: { entries: [mealWithNutrition], truncated: false },
      config: emptyHouseConfig,
    })
    expect(board.progress.kind).toBe("tracking")
    if (board.progress.kind === "tracking") {
      expect(board.progress.method).toBe("manual")
      expect(board.progress.bars.calories).toEqual({
        kind: "ratio",
        logged: 700,
        target: 2000,
        fraction: 0.35,
        remaining: 1300,
      })
    }
  })

  it("uses zero-target bars when a stored target is zero", () => {
    const board = dayBoardFrom({
      person,
      day,
      profile: {
        ...stubProfile,
        macroTargets: {
          method: "calculated",
          amounts: { calories: 0, proteinG: 150, carbsG: 200, fatG: 65 },
        },
      },
      log: { entries: [mealWithNutrition], truncated: false },
      config: emptyHouseConfig,
    })
    expect(board.progress.kind).toBe("tracking")
    if (board.progress.kind === "tracking") {
      expect(board.progress.method).toBe("calculated")
      expect(board.progress.bars.calories).toEqual({
        kind: "zero-target",
        logged: 700,
      })
    }
  })

  it("classifies description-only meals as uncounted rows", () => {
    const board = dayBoardFrom({
      person,
      day,
      profile: { ...stubProfile, macroTargets: null },
      log: { entries: [mealDescriptionOnly], truncated: false },
      config: emptyHouseConfig,
    })
    expect(board.meals.kind).toBe("complete")
    if (board.meals.kind === "complete") {
      expect(board.meals.items[0]).toEqual({
        kind: "uncounted",
        id: "m2",
        description: "Oatmeal",
        source: "bot",
        loggedAt: "2026-09-18T08:00:00.000Z",
      })
    }
  })

  it("returns empty meals when a truncated window has no entries", () => {
    const board = dayBoardFrom({
      person,
      day,
      profile: stubProfile,
      log: { entries: [], truncated: true },
      config: emptyHouseConfig,
    })
    expect(board.meals).toEqual({ kind: "empty" })
  })

  it("returns empty meals when there are no entries", () => {
    const board = dayBoardFrom({
      person,
      day,
      profile: stubProfile,
      log: { entries: [], truncated: false },
      config: emptyHouseConfig,
    })
    expect(board.meals).toEqual({ kind: "empty" })
  })

  it("returns truncated meals when the log window is capped", () => {
    const board = dayBoardFrom({
      person,
      day,
      profile: stubProfile,
      log: { entries: [mealWithNutrition, mealDescriptionOnly], truncated: true },
      config: emptyHouseConfig,
    })
    expect(board.meals).toEqual({
      kind: "truncated",
      items: [
        {
          kind: "counted",
          id: "m1",
          description: "Chicken and rice",
          nutrition: { calories: 700, proteinG: 50, carbsG: 60, fatG: 20 },
          source: "human",
          loggedAt: "2026-09-18T12:00:00.000Z",
        },
        {
          kind: "uncounted",
          id: "m2",
          description: "Oatmeal",
          source: "bot",
          loggedAt: "2026-09-18T08:00:00.000Z",
        },
      ],
      cap: HOME_DAY_LOG_LIMIT,
    })
  })

  it("maps household glance from config", () => {
    const board = dayBoardFrom({
      person,
      day,
      profile: stubProfile,
      log: { entries: [], truncated: false },
      config: {
        name: "The Flow House",
        fridgeLocations: ["Kitchen"],
        recipeSearchPlaces: [{ name: "Trader Joe's", type: "grocery", url: null }],
        preferences: { constraints: ["vegetarian"], budget: null, shoppingCadence: null },
      },
    })
    expect(board.household).toEqual({
      name: "The Flow House",
      fridgeLocations: ["Kitchen"],
      recipePlaceNames: ["Trader Joe's"],
      constraints: ["vegetarian"],
    })
  })
})
