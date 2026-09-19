import { describe, expect, it } from "vitest"
import {
  addMacroAmounts,
  humanMealToColumns,
  mealLogFromRow,
  mealToColumns,
  sumNutrition,
  ZERO_MACRO_AMOUNTS,
} from "./meal"

describe("mealLogFromRow", () => {
  it("parses a human meal with a description only", () => {
    expect(
      mealLogFromRow({
        id: "m1",
        person_id: "p1",
        logged_at: "2026-09-18T00:00:00.000Z",
        source: "human",
        payload: {
          schemaVersion: 1,
          kind: "meal",
          description: "Oatmeal",
          nutrition: null,
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        id: "m1",
        personId: "p1",
        loggedAt: "2026-09-18T00:00:00.000Z",
        source: "human",
        payload: {
          schemaVersion: 1,
          kind: "meal",
          description: "Oatmeal",
          nutrition: null,
        },
      },
    })
  })

  it("rejects a missing description", () => {
    expect(
      mealLogFromRow({
        id: "m1",
        person_id: "p1",
        logged_at: "2026-09-18T00:00:00.000Z",
        source: "human",
        payload: {
          schemaVersion: 1,
          kind: "meal",
          description: "  ",
          nutrition: null,
        },
      }),
    ).toEqual({ ok: false, error: "Enter what you ate." })
  })
})

describe("humanMealToColumns", () => {
  it("binds the session person and human source, never a form person id", () => {
    expect(
      humanMealToColumns("person-self", {
        payload: {
          schemaVersion: 1,
          kind: "meal",
          description: "Chicken and rice",
          nutrition: { calories: 700, proteinG: 50, carbsG: 60, fatG: 20 },
        },
      }),
    ).toEqual({
      person_id: "person-self",
      source: "human",
      payload: {
        schemaVersion: 1,
        kind: "meal",
        description: "Chicken and rice",
        nutrition: { calories: 700, proteinG: 50, carbsG: 60, fatG: 20 },
      },
    })
  })
})

describe("sumNutrition", () => {
  it("returns zeros for an empty list", () => {
    expect(sumNutrition([])).toEqual(ZERO_MACRO_AMOUNTS)
  })

  it("skips entries with null nutrition", () => {
    expect(
      sumNutrition([
        {
          id: "m1",
          personId: "p1",
          loggedAt: "2026-09-18T00:00:00.000Z",
          source: "human",
          payload: {
            schemaVersion: 1,
            kind: "meal",
            description: "Oatmeal",
            nutrition: null,
          },
        },
        {
          id: "m2",
          personId: "p1",
          loggedAt: "2026-09-18T01:00:00.000Z",
          source: "human",
          payload: {
            schemaVersion: 1,
            kind: "meal",
            description: "Chicken",
            nutrition: { calories: 500, proteinG: 40, carbsG: 30, fatG: 15 },
          },
        },
      ]),
    ).toEqual({ calories: 500, proteinG: 40, carbsG: 30, fatG: 15 })
  })

  it("adds human and bot meals with nutrition", () => {
    const human = {
      calories: 400,
      proteinG: 30,
      carbsG: 40,
      fatG: 10,
    }
    const bot = {
      calories: 200,
      proteinG: 10,
      carbsG: 20,
      fatG: 5,
    }
    expect(addMacroAmounts(human, bot)).toEqual({
      calories: 600,
      proteinG: 40,
      carbsG: 60,
      fatG: 15,
    })
    expect(
      sumNutrition([
        {
          id: "m1",
          personId: "p1",
          loggedAt: "2026-09-18T00:00:00.000Z",
          source: "human",
          payload: {
            schemaVersion: 1,
            kind: "meal",
            description: "Lunch",
            nutrition: human,
          },
        },
        {
          id: "m2",
          personId: "p1",
          loggedAt: "2026-09-18T01:00:00.000Z",
          source: "bot",
          payload: {
            schemaVersion: 1,
            kind: "meal",
            description: "Snack",
            nutrition: bot,
          },
        },
      ]),
    ).toEqual({ calories: 600, proteinG: 40, carbsG: 60, fatG: 15 })
  })
})

describe("mealToColumns", () => {
  it("binds bot source when the caller asks for a bot meal", () => {
    expect(
      mealToColumns("person-alice", "bot", {
        schemaVersion: 1,
        kind: "meal",
        description: "Oatmeal",
        nutrition: null,
      }),
    ).toEqual({
      person_id: "person-alice",
      source: "bot",
      payload: {
        schemaVersion: 1,
        kind: "meal",
        description: "Oatmeal",
        nutrition: null,
      },
    })
  })
})
