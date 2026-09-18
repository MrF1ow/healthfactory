export type PersonRole = "owner" | "member"

export type SignedInPerson = {
  id: string
  name: string
  role: PersonRole
  householdName: string
}

export type DeployFacts = {
  configured: boolean
  householdExists: boolean
  sessionUserId: string | null
  person: SignedInPerson | null
}

export type DeployScreen =
  | { kind: "unconfigured" }
  | { kind: "setup"; hasSession: boolean }
  | { kind: "login" }
  | { kind: "home"; person: SignedInPerson }
  | { kind: "blocked"; message: string }

export function deployScreen(facts: DeployFacts): DeployScreen {
  if (!facts.configured) {
    return { kind: "unconfigured" }
  }

  if (facts.person) {
    return { kind: "home", person: facts.person }
  }

  if (!facts.sessionUserId) {
    return facts.householdExists
      ? { kind: "login" }
      : { kind: "setup", hasSession: false }
  }

  if (!facts.householdExists) {
    return { kind: "setup", hasSession: true }
  }

  return {
    kind: "blocked",
    message:
      "This login is not a household member. A household member can add you from household settings.",
  }
}
