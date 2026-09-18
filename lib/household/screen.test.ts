import { describe, expect, it } from "vitest"
import { deployScreen } from "./screen"

const person = {
  id: "p1",
  name: "Ethan",
  role: "owner" as const,
  householdName: "The Flow House",
}

describe("deployScreen", () => {
  it("asks Ethan to set env when the app is not pointed at a project", () => {
    expect(
      deployScreen({
        configured: false,
        householdExists: false,
        sessionUserId: null,
        person: null,
      }),
    ).toEqual({ kind: "unconfigured" })
  })

  it("shows household setup when no household exists yet", () => {
    expect(
      deployScreen({
        configured: true,
        householdExists: false,
        sessionUserId: null,
        person: null,
      }),
    ).toEqual({ kind: "setup", hasSession: false })
  })

  it("shows login once the household exists and nobody is signed in", () => {
    expect(
      deployScreen({
        configured: true,
        householdExists: true,
        sessionUserId: null,
        person: null,
      }),
    ).toEqual({ kind: "login" })
  })

  it("shows home for a signed-in household person", () => {
    expect(
      deployScreen({
        configured: true,
        householdExists: true,
        sessionUserId: "auth-1",
        person,
      }),
    ).toEqual({ kind: "home", person })
  })

  it("retries setup if sign-in succeeded but bootstrap did not create a person", () => {
    expect(
      deployScreen({
        configured: true,
        householdExists: false,
        sessionUserId: "auth-1",
        person: null,
      }),
    ).toEqual({ kind: "setup", hasSession: true })
  })

  it("blocks a signed-in auth user who is not in the household", () => {
    expect(
      deployScreen({
        configured: true,
        householdExists: true,
        sessionUserId: "stranger",
        person: null,
      }),
    ).toEqual({
      kind: "blocked",
      message:
        "This login is not a household member. The owner adds members from household settings in a later release.",
    })
  })
})
