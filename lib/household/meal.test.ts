import { describe, expect, it } from "vitest"
import { humanMealToColumns, mealLogFromRow } from "./meal"

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
