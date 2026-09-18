import { describe, expect, it } from "vitest"
import {
  householdConfigFromRow,
  householdConfigToColumns,
  mergeHouseholdConfig,
  parseFridgeLocationsInput,
  parseHouseholdConfigPatch,
} from "./config"

describe("householdConfigFromRow", () => {
  it("parses fridge lines, recipe place type, and constraints from the db row", () => {
    expect(
      householdConfigFromRow({
        name: "The Flow House",
        fridge_locations: ["kitchen fridge", "garage freezer"],
        recipe_search_places: [
          { name: "H-E-B", type: "grocery", url: "https://www.heb.com" },
        ],
        household_preferences: {
          constraints: ["no pork"],
          budget: "$150/week",
          shoppingCadence: "Sundays",
        },
      }),
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
          constraints: ["no pork"],
          budget: "$150/week",
          shoppingCadence: "Sundays",
        },
      },
    })
  })

  it("defaults missing optional preferences to null", () => {
    expect(
      householdConfigFromRow({
        name: "House",
        fridge_locations: [],
        recipe_search_places: [],
        household_preferences: {},
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "House",
        fridgeLocations: [],
        recipeSearchPlaces: [],
        preferences: {
          constraints: [],
          budget: null,
          shoppingCadence: null,
        },
      },
    })
  })

  it("rejects optional preferences with the wrong type", () => {
    expect(
      householdConfigFromRow({
        name: "House",
        fridge_locations: [],
        recipe_search_places: [],
        household_preferences: {
          budget: 150,
          shoppingCadence: ["Sundays"],
        },
      }),
    ).toEqual({
      ok: false,
      error: "Budget and shopping cadence must be text.",
    })
  })

  it("rejects an unknown recipe type", () => {
    expect(
      householdConfigFromRow({
        name: "House",
        fridge_locations: [],
        recipe_search_places: [{ name: "Mystery", type: "supermarket", url: null }],
        household_preferences: {},
      }),
    ).toEqual({ ok: false, error: "Unknown recipe place type." })
  })
})

describe("householdConfigToColumns", () => {
  it("serializes HouseholdConfig back to household columns", () => {
    expect(
      householdConfigToColumns({
        name: "The Flow House",
        fridgeLocations: ["kitchen fridge"],
        recipeSearchPlaces: [
          { name: "H-E-B", type: "grocery", url: "https://www.heb.com" },
        ],
        preferences: {
          constraints: ["no pork"],
          budget: "$150/week",
          shoppingCadence: "Sundays",
        },
      }),
    ).toEqual({
      name: "The Flow House",
      fridge_locations: ["kitchen fridge"],
      recipe_search_places: [
        { name: "H-E-B", type: "grocery", url: "https://www.heb.com" },
      ],
      household_preferences: {
        constraints: ["no pork"],
        budget: "$150/week",
        shoppingCadence: "Sundays",
      },
    })
  })
})

describe("parseHouseholdConfigPatch", () => {
  it("merges name and budget onto the current config", () => {
    expect(
      parseHouseholdConfigPatch({
        name: "Flow House",
        preferences: { budget: "$200/week" },
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Flow House",
        preferences: { budget: "$200/week" },
      },
    })
    expect(
      mergeHouseholdConfig(
        {
          name: "The Flow House",
          fridgeLocations: ["kitchen fridge"],
          recipeSearchPlaces: [
            { name: "H-E-B", type: "grocery", url: "https://www.heb.com" },
          ],
          preferences: {
            constraints: ["no pork"],
            budget: "$150/week",
            shoppingCadence: "Sundays",
          },
        },
        { name: "Flow House", preferences: { budget: "$200/week" } },
      ),
    ).toEqual({
      name: "Flow House",
      fridgeLocations: ["kitchen fridge"],
      recipeSearchPlaces: [
        { name: "H-E-B", type: "grocery", url: "https://www.heb.com" },
      ],
      preferences: {
        constraints: ["no pork"],
        budget: "$200/week",
        shoppingCadence: "Sundays",
      },
    })
  })
})

describe("parseFridgeLocationsInput", () => {
  it("takes a locations list and drops blank names", () => {
    expect(
      parseFridgeLocationsInput({
        locations: ["kitchen fridge", "  garage freezer  ", ""],
      }),
    ).toEqual({
      ok: true,
      value: ["kitchen fridge", "garage freezer"],
    })
  })
})
