import { describe, expect, it } from "vitest"
import { authEmailForLogin } from "./login"

describe("authEmailForLogin", () => {
  it("returns an email login as-is", () => {
    expect(
      authEmailForLogin({ kind: "email", email: "sam@example.com" }),
    ).toBe("sam@example.com")
  })

  it("maps a username to name@household.invalid", () => {
    expect(authEmailForLogin({ kind: "username", username: "name" })).toBe(
      "name@household.invalid",
    )
  })
})
