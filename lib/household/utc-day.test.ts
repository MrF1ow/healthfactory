import { describe, expect, it } from "vitest"
import { utcDayFromInstant, utcDayLabel } from "./utc-day"

describe("utcDayFromInstant", () => {
  it("maps an instant to the UTC calendar day and sinceIso", () => {
    const day = utcDayFromInstant(new Date("2026-09-18T15:04:00.000Z"))
    expect(day).toEqual({
      ymd: "2026-09-18",
      sinceIso: "2026-09-18T00:00:00.000Z",
    })
  })

  it("labels the day as a UTC calendar date", () => {
    const day = utcDayFromInstant(new Date("2026-09-18T15:04:00.000Z"))
    expect(utcDayLabel(day)).toBe("September 18, 2026 UTC")
  })
})
