import { describe, expect, it } from "vitest"
import {
  parseBootstrapInput,
  parseHouseholdConfig,
  parseMemberInput,
  parseOwnerNames,
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
