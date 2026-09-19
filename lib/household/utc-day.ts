export type UtcDay = {
  ymd: string
  sinceIso: string
}

export function utcDayFromInstant(now: Date): UtcDay {
  const ymd = now.toISOString().slice(0, 10)
  return { ymd, sinceIso: `${ymd}T00:00:00.000Z` }
}

export function utcDayNow(now: Date = new Date()): UtcDay {
  return utcDayFromInstant(now)
}

export function utcDayLabel(day: UtcDay): string {
  const [year, month, dayNum] = day.ymd.split("-").map(Number)
  const formatted = new Date(Date.UTC(year, month - 1, dayNum)).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" },
  )
  return `${formatted} UTC`
}
