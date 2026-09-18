import { describe, expect, it } from "vitest"
import { personProfileFromRow, personProfileToColumns } from "./profile"

const emptyPreferences = {
  schemaVersion: 1 as const,
  dietaryRestrictions: [],
  allergies: [],
  likes: [],
  dislikes: [],
  notes: null,
}

const defaultBotConfig = {
  schemaVersion: 1 as const,
  checkInCadence: "off" as const,
  guidance: null,
}

describe("personProfileFromRow", () => {
  it("parses an empty stub row into null demographics and default json", () => {
    expect(
      personProfileFromRow({
        age: null,
        sex: null,
        height_cm: null,
        weight_kg: null,
        activity_level: null,
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        macro_method: null,
        preferences: {},
        bot_config: {},
      }),
    ).toEqual({
      ok: true,
      value: {
        ageYears: null,
        sex: null,
        heightCm: null,
        weightKg: null,
        activityLevel: null,
        macroTargets: null,
        preferences: emptyPreferences,
        botConfig: defaultBotConfig,
      },
    })
  })

  it("parses a filled profile with manual macros", () => {
    expect(
      personProfileFromRow({
        age: 36,
        sex: "male",
        height_cm: 180,
        weight_kg: 82.5,
        activity_level: "moderate",
        calories: 2400,
        protein_g: 180,
        carbs_g: 220,
        fat_g: 70,
        macro_method: "manual",
        preferences: {
          schemaVersion: 1,
          dietaryRestrictions: ["no pork"],
          allergies: ["shellfish"],
          likes: ["rice"],
          dislikes: ["cilantro"],
          notes: "weeknight cooking",
        },
        bot_config: {
          schemaVersion: 1,
          checkInCadence: "daily",
          guidance: "keep dinners simple",
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        ageYears: 36,
        sex: "male",
        heightCm: 180,
        weightKg: 82.5,
        activityLevel: "moderate",
        macroTargets: {
          method: "manual",
          amounts: {
            calories: 2400,
            proteinG: 180,
            carbsG: 220,
            fatG: 70,
          },
        },
        preferences: {
          schemaVersion: 1,
          dietaryRestrictions: ["no pork"],
          allergies: ["shellfish"],
          likes: ["rice"],
          dislikes: ["cilantro"],
          notes: "weeknight cooking",
        },
        botConfig: {
          schemaVersion: 1,
          checkInCadence: "daily",
          guidance: "keep dinners simple",
        },
      },
    })
  })

  it("rejects an unknown sex value", () => {
    expect(
      personProfileFromRow({
        age: null,
        sex: "unknown",
        height_cm: null,
        weight_kg: null,
        activity_level: null,
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        macro_method: null,
        preferences: {},
        bot_config: {},
      }),
    ).toEqual({ ok: false, error: "Unknown sex." })
  })

  it("rejects a partial macro set", () => {
    expect(
      personProfileFromRow({
        age: null,
        sex: null,
        height_cm: null,
        weight_kg: null,
        activity_level: null,
        calories: 2000,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        macro_method: "manual",
        preferences: {},
        bot_config: {},
      }),
    ).toEqual({ ok: false, error: "Enter calories, protein, carbs, and fat together." })
  })
})

describe("personProfileToColumns", () => {
  it("writes manual macros and never a calculated method", () => {
    expect(
      personProfileToColumns({
        ageYears: 36,
        sex: "female",
        heightCm: 165,
        weightKg: 60,
        activityLevel: "light",
        macroTargets: {
          method: "manual",
          amounts: { calories: 1800, proteinG: 120, carbsG: 180, fatG: 55 },
        },
        preferences: {
          schemaVersion: 1,
          dietaryRestrictions: ["vegetarian"],
          allergies: [],
          likes: [],
          dislikes: [],
          notes: null,
        },
        botConfig: {
          schemaVersion: 1,
          checkInCadence: "weekly",
          guidance: null,
        },
      }),
    ).toEqual({
      age: 36,
      sex: "female",
      height_cm: 165,
      weight_kg: 60,
      activity_level: "light",
      calories: 1800,
      protein_g: 120,
      carbs_g: 180,
      fat_g: 55,
      macro_method: "manual",
      preferences: {
        schemaVersion: 1,
        dietaryRestrictions: ["vegetarian"],
        allergies: [],
        likes: [],
        dislikes: [],
        notes: null,
      },
      bot_config: {
        schemaVersion: 1,
        checkInCadence: "weekly",
        guidance: null,
      },
    })
  })
})
