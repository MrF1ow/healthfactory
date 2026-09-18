import { describe, expect, it } from "vitest"
import {
  parseBootstrapInput,
  parseHouseholdConfig,
  parseMealInput,
  parseMemberInput,
  parseOwnerNames,
  parseProfileInput,
  parseSignInInput,
} from "./parse"

function form(entries: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value)
  }
  return data
}

describe("parseOwnerNames", () => {
  it("accepts names without credentials", () => {
    expect(
      parseOwnerNames(form({ householdName: "House", personName: "Ethan" })),
    ).toEqual({
      ok: true,
      value: { householdName: "House", personName: "Ethan" },
    })
  })
})

describe("parseBootstrapInput", () => {
  it("accepts a trimmed first-run form", () => {
    expect(
      parseBootstrapInput(
        form({
          householdName: "  The Flow House  ",
          personName: " Ethan ",
          email: "  Ethan@example.com ",
          password: "longenough",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        householdName: "The Flow House",
        personName: "Ethan",
        email: "ethan@example.com",
        password: "longenough",
      },
    })
  })

  it("rejects a missing household name", () => {
    expect(
      parseBootstrapInput(
        form({
          householdName: " ",
          personName: "Ethan",
          email: "ethan@example.com",
          password: "longenough",
        }),
      ),
    ).toEqual({ ok: false, error: "Enter a household name." })
  })

  it("rejects a short password", () => {
    expect(
      parseBootstrapInput(
        form({
          householdName: "House",
          personName: "Ethan",
          email: "ethan@example.com",
          password: "short",
        }),
      ),
    ).toEqual({ ok: false, error: "Password must be at least 8 characters." })
  })
})

describe("parseSignInInput", () => {
  it("parses an email identifier", () => {
    expect(
      parseSignInInput(
        form({ identifier: "Ethan@Example.com", password: "secret" }),
      ),
    ).toEqual({
      ok: true,
      value: {
        login: { kind: "email", email: "ethan@example.com" },
        password: "secret",
      },
    })
  })

  it("parses a username identifier", () => {
    expect(
      parseSignInInput(form({ identifier: "Wife.1", password: "secret" })),
    ).toEqual({
      ok: true,
      value: {
        login: { kind: "username", username: "wife.1" },
        password: "secret",
      },
    })
  })

  it("rejects a missing password", () => {
    expect(
      parseSignInInput(form({ identifier: "ethan@example.com", password: "" })),
    ).toEqual({ ok: false, error: "Enter your password." })
  })
})

describe("parseMemberInput", () => {
  it("accepts a member with email", () => {
    expect(
      parseMemberInput(
        form({
          name: "  Sam ",
          email: "  Sam@example.com ",
          username: "",
          password: "longenough",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        name: "Sam",
        login: { kind: "email", email: "sam@example.com" },
        password: "longenough",
      },
    })
  })

  it("accepts a member with username only", () => {
    expect(
      parseMemberInput(
        form({
          name: "Sam",
          email: "",
          username: "Sam_1",
          password: "longenough",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        name: "Sam",
        login: { kind: "username", username: "sam_1" },
        password: "longenough",
      },
    })
  })

  it("rejects neither identifier", () => {
    expect(
      parseMemberInput(
        form({
          name: "Sam",
          email: "",
          username: "",
          password: "longenough",
        }),
      ),
    ).toEqual({ ok: false, error: "Enter an email or username." })
  })

  it("rejects a short password", () => {
    expect(
      parseMemberInput(
        form({
          name: "Sam",
          email: "sam@example.com",
          username: "",
          password: "short",
        }),
      ),
    ).toEqual({ ok: false, error: "Password must be at least 8 characters." })
  })
})

describe("parseHouseholdConfig", () => {
  it("parses fridge lines, a recipe place type, and constraints", () => {
    expect(
      parseHouseholdConfig(
        form({
          name: "  The Flow House  ",
          fridgeLocations: "kitchen fridge\n garage freezer \n\n",
          recipeSearchPlaces: "H-E-B | grocery | https://www.heb.com\n",
          constraints: "no pork\nno shellfish\n",
          budget: " $150/week ",
          shoppingCadence: " Sundays ",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        name: "The Flow House",
        fridgeLocations: ["kitchen fridge", "garage freezer"],
        recipeSearchPlaces: [
          {
            name: "H-E-B",
            type: "grocery",
            url: "https://www.heb.com",
          },
        ],
        preferences: {
          constraints: ["no pork", "no shellfish"],
          budget: "$150/week",
          shoppingCadence: "Sundays",
        },
      },
    })
  })

  it("rejects an unknown recipe type", () => {
    expect(
      parseHouseholdConfig(
        form({
          name: "House",
          fridgeLocations: "",
          recipeSearchPlaces: "Mystery | supermarket |",
          constraints: "",
          budget: "",
          shoppingCadence: "",
        }),
      ),
    ).toEqual({
      ok: false,
      error: "Unknown recipe place type.",
    })
  })
})

describe("parseProfileInput", () => {
  it("parses empty optional fields into a blank draft", () => {
    expect(
      parseProfileInput(
        form({
          age: "",
          sex: "",
          heightCm: "",
          weightKg: "",
          activityLevel: "",
          calories: "",
          proteinG: "",
          carbsG: "",
          fatG: "",
          dietaryRestrictions: "",
          allergies: "",
          likes: "",
          dislikes: "",
          notes: "",
          checkInCadence: "off",
          guidance: "",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
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
        botConfig: {
          schemaVersion: 1,
          checkInCadence: "off",
          guidance: null,
        },
      },
    })
  })

  it("parses manual macros and preference lines", () => {
    expect(
      parseProfileInput(
        form({
          age: " 36 ",
          sex: "male",
          heightCm: "180",
          weightKg: "82.5",
          activityLevel: "moderate",
          calories: "2400",
          proteinG: "180",
          carbsG: "220",
          fatG: "70",
          dietaryRestrictions: "no pork\n",
          allergies: "shellfish\n",
          likes: "rice\n",
          dislikes: "cilantro\n",
          notes: " weeknight cooking ",
          checkInCadence: "daily",
          guidance: " keep dinners simple ",
        }),
      ),
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

  it("rejects a negative calorie target", () => {
    expect(
      parseProfileInput(
        form({
          age: "",
          sex: "",
          heightCm: "",
          weightKg: "",
          activityLevel: "",
          calories: "-1",
          proteinG: "10",
          carbsG: "10",
          fatG: "10",
          dietaryRestrictions: "",
          allergies: "",
          likes: "",
          dislikes: "",
          notes: "",
          checkInCadence: "off",
          guidance: "",
        }),
      ),
    ).toEqual({ ok: false, error: "Macro targets cannot be negative." })
  })

  it("rejects calories without the rest of the set", () => {
    expect(
      parseProfileInput(
        form({
          age: "",
          sex: "",
          heightCm: "",
          weightKg: "",
          activityLevel: "",
          calories: "2000",
          proteinG: "",
          carbsG: "",
          fatG: "",
          dietaryRestrictions: "",
          allergies: "",
          likes: "",
          dislikes: "",
          notes: "",
          checkInCadence: "off",
          guidance: "",
        }),
      ),
    ).toEqual({
      ok: false,
      error: "Enter calories, protein, carbs, and fat together.",
    })
  })

  it("does not read a person id from the form", () => {
    const parsed = parseProfileInput(
      form({
        person_id: "someone-else",
        personId: "someone-else",
        age: "",
        sex: "",
        heightCm: "",
        weightKg: "",
        activityLevel: "",
        calories: "",
        proteinG: "",
        carbsG: "",
        fatG: "",
        dietaryRestrictions: "",
        allergies: "",
        likes: "",
        dislikes: "",
        notes: "",
        checkInCadence: "off",
        guidance: "",
      }),
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value).not.toHaveProperty("personId")
      expect(parsed.value).not.toHaveProperty("person_id")
    }
  })
})

describe("parseMealInput", () => {
  it("parses a description-only human meal", () => {
    expect(parseMealInput(form({ description: "  Oatmeal  " }))).toEqual({
      ok: true,
      value: {
        payload: {
          schemaVersion: 1,
          kind: "meal",
          description: "Oatmeal",
          nutrition: null,
        },
      },
    })
  })

  it("parses a complete nutrition set", () => {
    expect(
      parseMealInput(
        form({
          description: "Chicken and rice",
          calories: "700",
          proteinG: "50",
          carbsG: "60",
          fatG: "20",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        payload: {
          schemaVersion: 1,
          kind: "meal",
          description: "Chicken and rice",
          nutrition: { calories: 700, proteinG: 50, carbsG: 60, fatG: 20 },
        },
      },
    })
  })

  it("rejects an empty description", () => {
    expect(parseMealInput(form({ description: "  " }))).toEqual({
      ok: false,
      error: "Enter what you ate.",
    })
  })

  it("does not read person id or source from the form", () => {
    const parsed = parseMealInput(
      form({
        description: "Eggs",
        person_id: "someone-else",
        source: "bot",
      }),
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value).not.toHaveProperty("personId")
      expect(parsed.value).not.toHaveProperty("source")
    }
  })
})
