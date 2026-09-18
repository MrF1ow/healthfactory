import { describe, expect, it } from "vitest"
import { createHouseholdReads } from "./reads"

type Row = Record<string, unknown>

class FakeQuery {
  constructor(private rows: Row[]) {}

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

  maybeSingle() {
    return Promise.resolve({ data: this.rows[0] ?? null, error: null })
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
      return new FakeQuery([...(tables[table] ?? [])])
    },
  }
}

const houseA = "house-a"
const houseB = "house-b"
const aliceId = "person-alice"
const bobId = "person-bob"

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

const householdRows = [
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
    fridge_locations: ["kitchen fridge", "garage freezer"],
    recipe_search_places: [
      { name: "H-E-B", type: "grocery", url: "https://www.heb.com" },
    ],
    household_preferences: {
      constraints: ["no pork"],
      budget: "$150/week",
      shoppingCadence: "Sundays",
    },
  },
]

const peopleRows = [
  {
    id: bobId,
    household_id: houseB,
    name: "Bob",
    email: "bob@example.com",
    role: "owner",
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "person-charlie",
    household_id: houseA,
    name: "Charlie",
    email: null,
    role: "member",
    created_at: "2026-02-01T00:00:00.000Z",
  },
  {
    id: aliceId,
    household_id: houseA,
    name: "Alice",
    email: "alice@example.com",
    role: "owner",
    created_at: "2026-03-01T00:00:00.000Z",
  },
]

const profileRows = [
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
    preferences: {},
    bot_config: {},
  },
  {
    person_id: aliceId,
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
  },
]

const oatmeal = {
  schemaVersion: 1,
  kind: "meal",
  description: "Oatmeal",
  nutrition: null,
}

const salad = {
  schemaVersion: 1,
  kind: "meal",
  description: "Salad",
  nutrition: null,
}

const toast = {
  schemaVersion: 1,
  kind: "meal",
  description: "Toast",
  nutrition: null,
}

const mealRows = [
  {
    id: "meal-bob",
    person_id: bobId,
    logged_at: "2026-09-18T18:00:00.000Z",
    source: "human",
    payload: oatmeal,
  },
  {
    id: "meal-toast",
    person_id: aliceId,
    logged_at: "2026-09-01T12:00:00.000Z",
    source: "human",
    payload: toast,
  },
  {
    id: "meal-salad",
    person_id: aliceId,
    logged_at: "2026-09-10T12:00:00.000Z",
    source: "human",
    payload: salad,
  },
  {
    id: "meal-oatmeal",
    person_id: aliceId,
    logged_at: "2026-09-18T12:00:00.000Z",
    source: "human",
    payload: oatmeal,
  },
]

function houseAReads() {
  return createHouseholdReads(
    fakeClient({
      households: householdRows,
      people: peopleRows,
      person_profiles: profileRows,
      meal_logs: mealRows,
    }) as never,
    houseA,
  )
}

describe("createHouseholdReads", () => {
  it("returns this household's config, not the first row in the table", async () => {
    expect(await houseAReads().config()).toEqual({
      ok: true,
      value: {
        name: "The Flow House",
        fridgeLocations: ["kitchen fridge", "garage freezer"],
        recipeSearchPlaces: [
          { name: "H-E-B", type: "grocery", url: "https://www.heb.com" },
        ],
        preferences: {
          constraints: ["no pork"],
          budget: "$150/week",
          shoppingCadence: "Sundays",
        },
      },
    })
  })

  it("returns this household's members in created_at order", async () => {
    expect(await houseAReads().members()).toEqual({
      ok: true,
      value: [
        {
          id: "person-charlie",
          name: "Charlie",
          email: null,
          role: "member",
        },
        {
          id: aliceId,
          name: "Alice",
          email: "alice@example.com",
          role: "owner",
        },
      ],
    })
  })

  it("returns a profile only when the person belongs to this household", async () => {
    expect(await houseAReads().profile(aliceId)).toEqual({
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
    expect(await houseAReads().profile(bobId)).toEqual({
      ok: false,
      error: "Not found.",
    })
  })

  it("returns log entries at or after since, newest first, and truncated when more remain", async () => {
    expect(
      await houseAReads().log(aliceId, {
        since: "2026-09-10T12:00:00.000Z",
        limit: 10,
      }),
    ).toEqual({
      ok: true,
      value: {
        entries: [
          {
            id: "meal-oatmeal",
            personId: aliceId,
            loggedAt: "2026-09-18T12:00:00.000Z",
            source: "human",
            payload: oatmeal,
          },
          {
            id: "meal-salad",
            personId: aliceId,
            loggedAt: "2026-09-10T12:00:00.000Z",
            source: "human",
            payload: salad,
          },
        ],
        truncated: false,
      },
    })
    expect(await houseAReads().log(aliceId, { since: null, limit: 2 })).toEqual({
      ok: true,
      value: {
        entries: [
          {
            id: "meal-oatmeal",
            personId: aliceId,
            loggedAt: "2026-09-18T12:00:00.000Z",
            source: "human",
            payload: oatmeal,
          },
          {
            id: "meal-salad",
            personId: aliceId,
            loggedAt: "2026-09-10T12:00:00.000Z",
            source: "human",
            payload: salad,
          },
        ],
        truncated: true,
      },
    })
    expect(await houseAReads().log(bobId, { since: null, limit: 10 })).toEqual({
      ok: false,
      error: "Not found.",
    })
  })
})
