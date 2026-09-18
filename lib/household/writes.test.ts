import { describe, expect, it } from "vitest"
import { createHouseholdWrites } from "./writes"

type Row = Record<string, unknown>

class FakeQuery {
  private patch: Row | null = null
  private inserted: Row | null = null

  constructor(
    private table: Row[],
    private rows: Row[],
  ) {}

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.rows = this.rows.filter((row) => row[column] === value)
    return this
  }

  gte(column: string, value: unknown) {
    this.rows = this.rows.filter((row) => String(row[column]) >= String(value))
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    const ascending = options?.ascending !== false
    this.rows = [...this.rows].sort((left, right) => {
      const a = String(left[column] ?? "")
      const b = String(right[column] ?? "")
      return ascending ? a.localeCompare(b) : b.localeCompare(a)
    })
    return this
  }

  limit(count: number) {
    this.rows = this.rows.slice(0, count)
    return this
  }

  update(values: Row) {
    this.patch = values
    return this
  }

  insert(values: Row) {
    const row = {
      id: typeof values.id === "string" ? values.id : "meal-new",
      logged_at:
        typeof values.logged_at === "string"
          ? values.logged_at
          : "2026-09-18T15:00:00.000Z",
      ...values,
    }
    this.table.push(row)
    this.inserted = row
    this.rows = [row]
    return this
  }

  maybeSingle() {
    if (this.inserted) {
      return Promise.resolve({ data: this.inserted, error: null })
    }
    const row = this.rows[0]
    if (!row) {
      return Promise.resolve({ data: null, error: null })
    }
    if (this.patch) {
      Object.assign(row, this.patch)
    }
    return Promise.resolve({ data: { ...row }, error: null })
  }

  then<T>(
    resolve: (value: { data: Row[]; error: null }) => T,
    reject?: (reason: unknown) => T,
  ) {
    return Promise.resolve({ data: this.rows, error: null }).then(resolve, reject)
  }
}

function fakeClient(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const data = tables[table] ?? (tables[table] = [])
      return new FakeQuery(data, [...data])
    },
  }
}

const houseA = "house-a"
const houseB = "house-b"
const aliceId = "person-alice"
const bobId = "person-bob"

const emptyPreferences = {
  schemaVersion: 1 as const,
  dietaryRestrictions: [] as string[],
  allergies: [] as string[],
  likes: [] as string[],
  dislikes: [] as string[],
  notes: null as string | null,
}

function tables() {
  return {
    households: [
      {
        id: houseB,
        name: "Other House",
        fridge_locations: ["shed"],
        recipe_search_places: [],
        household_preferences: {},
      },
      {
        id: houseA,
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
      },
    ],
    people: [
      {
        id: bobId,
        household_id: houseB,
        name: "Bob",
        email: "bob@example.com",
        role: "owner",
      },
      {
        id: aliceId,
        household_id: houseA,
        name: "Alice",
        email: "alice@example.com",
        role: "owner",
      },
    ],
    person_profiles: [
      {
        person_id: bobId,
        age: 40,
        sex: "male",
        height_cm: 180,
        weight_kg: 80,
        activity_level: "active",
        calories: 2500,
        protein_g: 180,
        carbs_g: 250,
        fat_g: 70,
        macro_method: "manual",
        preferences: { ...emptyPreferences, likes: ["steak"] },
        bot_config: {},
      },
      {
        person_id: aliceId,
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
          dietaryRestrictions: ["no pork"],
          allergies: [],
          likes: ["rice"],
          dislikes: [],
          notes: "weeknight cooking",
        },
        bot_config: {},
      },
    ],
    meal_logs: [] as Row[],
  }
}

function tokenWrites(store = tables()) {
  return {
    store,
    writes: createHouseholdWrites(
      fakeClient(store) as never,
      houseA,
      { kind: "service-token" },
    ),
  }
}

function sessionWrites(store = tables()) {
  return createHouseholdWrites(fakeClient(store) as never, houseA, {
    kind: "session",
    personId: aliceId,
  })
}

describe("createHouseholdWrites", () => {
  it("updates macro columns only and keeps demographics", async () => {
    const { store, writes } = tokenWrites()
    expect(
      await writes.updateMacroTargets(aliceId, {
        calories: 2000,
        proteinG: 140,
        carbsG: 200,
        fatG: 60,
      }),
    ).toEqual({
      ok: true,
      value: {
        method: "manual",
        amounts: { calories: 2000, proteinG: 140, carbsG: 200, fatG: 60 },
      },
    })
    const row = store.person_profiles.find((item) => item.person_id === aliceId)
    expect(row).toMatchObject({
      age: 36,
      sex: "female",
      height_cm: 165,
      calories: 2000,
      protein_g: 140,
      macro_method: "manual",
    })
  })

  it("rejects a person from another household", async () => {
    const { writes } = tokenWrites()
    expect(await writes.updateMacroTargets(bobId, {
      calories: 2000,
      proteinG: 140,
      carbsG: 200,
      fatG: 60,
    })).toEqual({ ok: false, error: "Not found." })
  })

  it("merges preference lists without wiping notes", async () => {
    const { writes } = tokenWrites()
    expect(
      await writes.updatePreferences(aliceId, {
        dislikes: ["cilantro"],
      }),
    ).toEqual({
      ok: true,
      value: {
        schemaVersion: 1,
        dietaryRestrictions: ["no pork"],
        allergies: [],
        likes: ["rice"],
        dislikes: ["cilantro"],
        notes: "weeknight cooking",
      },
    })
  })

  it("logs a bot meal for the service-token actor", async () => {
    const { writes } = tokenWrites()
    expect(
      await writes.logMeal(aliceId, { description: "Oatmeal" }),
    ).toEqual({
      ok: true,
      value: {
        id: "meal-new",
        personId: aliceId,
        loggedAt: "2026-09-18T15:00:00.000Z",
        source: "bot",
        payload: {
          schemaVersion: 1,
          kind: "meal",
          description: "Oatmeal",
          nutrition: null,
        },
      },
    })
  })

  it("logs a human meal for the session actor and refuses another person", async () => {
    const writes = sessionWrites()
    expect(
      await writes.logMeal(aliceId, { description: "Eggs" }),
    ).toMatchObject({
      ok: true,
      value: { personId: aliceId, source: "human" },
    })
    expect(await writes.logMeal(bobId, { description: "Eggs" })).toEqual({
      ok: false,
      error: "Not found.",
    })
  })

  it("patches household config and replaces fridge locations", async () => {
    const { writes } = tokenWrites()
    expect(
      await writes.updateHouseholdConfig({
        name: "Flow House",
        preferences: { budget: "$200/week" },
      }),
    ).toEqual({
      ok: true,
      value: {
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
      },
    })
    expect(
      await writes.updateFridgeLocations({
        locations: ["kitchen fridge", "garage freezer"],
      }),
    ).toEqual({
      ok: true,
      value: ["kitchen fridge", "garage freezer"],
    })
  })

  it("rejects partial macros with the same error as the profile form", async () => {
    const { writes } = tokenWrites()
    expect(
      await writes.updateMacroTargets(aliceId, { calories: 2000 }),
    ).toEqual({
      ok: false,
      error: "Enter calories, protein, carbs, and fat together.",
    })
  })
})
