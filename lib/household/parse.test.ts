import { describe, expect, it } from "vitest"
import { parseBootstrapInput, parseOwnerNames, parseSignInInput } from "./parse"

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
  it("lowercases the email", () => {
    expect(
      parseSignInInput(form({ email: "Ethan@Example.com", password: "secret" })),
    ).toEqual({
      ok: true,
      value: { email: "ethan@example.com", password: "secret" },
    })
  })

  it("rejects a missing password", () => {
    expect(parseSignInInput(form({ email: "ethan@example.com", password: "" }))).toEqual(
      { ok: false, error: "Enter your password." },
    )
  })
})
