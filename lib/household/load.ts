import { publicSupabaseEnv } from "@/lib/env"
import type { HouseholdConfig } from "@/lib/household/config"
import { dayBoardFrom, HOME_DAY_LOG_LIMIT, type DayBoard } from "@/lib/household/day-board"
import type { PersonProfile } from "@/lib/household/profile"
import {
  createHouseholdReads,
  type HouseholdMember,
} from "@/lib/household/reads"
import {
  deployScreen,
  type DeployFacts,
  type DeployScreen,
  type PersonRole,
  type SignedInPerson,
} from "@/lib/household/screen"
import { utcDayNow } from "@/lib/household/utc-day"
import { createClient } from "@/lib/supabase/server"

export type { HouseholdMember }

function householdNameFromJoin(households: unknown): string | null {
  if (Array.isArray(households)) {
    const first = households[0]
    if (first && typeof first === "object" && "name" in first && typeof first.name === "string") {
      return first.name
    }
    return null
  }
  if (households && typeof households === "object" && "name" in households) {
    const name = (households as { name: unknown }).name
    return typeof name === "string" ? name : null
  }
  return null
}

export type GateScreen = Exclude<DeployScreen, { kind: "home" }>

export type RootView =
  | { chrome: "gate"; screen: GateScreen }
  | { chrome: "app"; board: DayBoard }

export type RootViewResult =
  | { ok: true; view: RootView }
  | { ok: false; error: string }

export async function loadRootView(): Promise<RootViewResult> {
  if (!publicSupabaseEnv()) {
    return {
      ok: true,
      view: {
        chrome: "gate",
        screen: { kind: "unconfigured" },
      },
    }
  }

  try {
    const supabase = await createClient()
    const [{ data: claimsData }, existsResult] = await Promise.all([
      supabase.auth.getClaims(),
      supabase.rpc("household_exists"),
    ])

    if (existsResult.error) {
      return {
        ok: false,
        error: `Could not read household state. Apply the repo migrations to your Supabase project. ${existsResult.error.message}`,
      }
    }

    const sessionUserId =
      typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null

    const facts: DeployFacts = {
      configured: true,
      householdExists: existsResult.data === true,
      sessionUserId,
      person: null,
    }

    let householdId: string | null = null

    if (sessionUserId) {
      const { data: row, error } = await supabase
        .from("people")
        .select("id, name, role, household_id, households ( name )")
        .eq("auth_user_id", sessionUserId)
        .maybeSingle()

      if (error) {
        return {
          ok: false,
          error: `Could not load the signed-in person. ${error.message}`,
        }
      }

      if (row) {
        const record = row as {
          id: unknown
          name: unknown
          role: unknown
          household_id: unknown
          households: unknown
        }
        const householdName = householdNameFromJoin(record.households)
        if (
          typeof record.id === "string" &&
          typeof record.name === "string" &&
          (record.role === "owner" || record.role === "member") &&
          typeof record.household_id === "string" &&
          typeof householdName === "string"
        ) {
          facts.person = {
            id: record.id,
            name: record.name,
            role: record.role,
            householdName,
          }
          householdId = record.household_id
        }
      }
    }

    const screen = deployScreen(facts)
    if (screen.kind !== "home") {
      return { ok: true, view: { chrome: "gate", screen } }
    }

    if (!householdId) {
      return { ok: false, error: "Could not load the signed-in person." }
    }

    const person = screen.person
    const reads = createHouseholdReads(supabase, householdId)
    const day = utcDayNow()

    const [profile, log, config] = await Promise.all([
      reads.profile(person.id),
      reads.log(person.id, { since: day.sinceIso, limit: HOME_DAY_LOG_LIMIT }),
      reads.config(),
    ])

    if (!profile.ok) {
      return { ok: false, error: profile.error }
    }
    if (!log.ok) {
      return { ok: false, error: log.error }
    }
    if (!config.ok) {
      return { ok: false, error: config.error }
    }

    return {
      ok: true,
      view: {
        chrome: "app",
        board: dayBoardFrom({
          person,
          day,
          profile: profile.value,
          log: log.value,
          config: config.value,
        }),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { ok: false, error: `Could not reach Supabase. ${message}` }
  }
}

export type SessionPerson = {
  id: string
  name: string
  role: PersonRole
  householdId: string
  householdName: string
}

export type SessionLoadResult =
  | { ok: true; client: Awaited<ReturnType<typeof createClient>>; person: SessionPerson }
  | { ok: false; kind: "unconfigured" }
  | { ok: false; kind: "redirect" }
  | { ok: false; kind: "error"; error: string }

export async function loadSessionPerson(): Promise<SessionLoadResult> {
  if (!publicSupabaseEnv()) {
    return { ok: false, kind: "unconfigured" }
  }

  try {
    const client = await createClient()
    const { data: claimsData } = await client.auth.getClaims()
    const sessionUserId =
      typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null
    if (!sessionUserId) {
      return { ok: false, kind: "redirect" }
    }

    const { data: personRow, error: personError } = await client
      .from("people")
      .select("id, name, role, household_id, households ( name )")
      .eq("auth_user_id", sessionUserId)
      .maybeSingle()

    if (personError) {
      return {
        ok: false,
        kind: "error",
        error: `Could not load the signed-in person. ${personError.message}`,
      }
    }
    if (!personRow) {
      return { ok: false, kind: "redirect" }
    }

    const personRecord = personRow as {
      id: unknown
      name: unknown
      role: unknown
      household_id: unknown
      households: unknown
    }
    const householdName = householdNameFromJoin(personRecord.households)
    if (
      typeof personRecord.id !== "string" ||
      typeof personRecord.name !== "string" ||
      (personRecord.role !== "owner" && personRecord.role !== "member") ||
      typeof personRecord.household_id !== "string" ||
      typeof householdName !== "string"
    ) {
      return { ok: false, kind: "redirect" }
    }

    return {
      ok: true,
      client,
      person: {
        id: personRecord.id,
        name: personRecord.name,
        role: personRecord.role,
        householdId: personRecord.household_id,
        householdName,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { ok: false, kind: "error", error: `Could not reach Supabase. ${message}` }
  }
}

function signedInPerson(person: SessionPerson): SignedInPerson {
  return {
    id: person.id,
    name: person.name,
    role: person.role,
    householdName: person.householdName,
  }
}

function asPageFailure(
  session: Exclude<SessionLoadResult, { ok: true }>,
): { ok: false; kind: "redirect" } | { ok: false; kind: "error"; error: string } {
  if (session.kind === "error") {
    return { ok: false, kind: "error", error: session.error }
  }
  return { ok: false, kind: "redirect" }
}

export type HouseholdSettings = {
  person: SignedInPerson
  config: HouseholdConfig
  people: HouseholdMember[]
  tokenIssuedAt: string | null
}

export type SettingsLoadResult =
  | { ok: true; settings: HouseholdSettings }
  | { ok: false; kind: "redirect" }
  | { ok: false; kind: "error"; error: string }

export async function loadHouseholdSettings(): Promise<SettingsLoadResult> {
  try {
    const session = await loadSessionPerson()
    if (!session.ok) {
      return asPageFailure(session)
    }

    const reads = createHouseholdReads(session.client, session.person.householdId)
    const config = await reads.config()
    if (!config.ok) {
      return { ok: false, kind: "error", error: config.error }
    }
    const people = await reads.members()
    if (!people.ok) {
      return { ok: false, kind: "error", error: people.error }
    }

    const { data: tokenStatus, error: tokenStatusError } = await session.client.rpc(
      "household_mcp_token_status",
    )
    if (tokenStatusError) {
      return {
        ok: false,
        kind: "error",
        error: `Could not load MCP token status. ${tokenStatusError.message}`,
      }
    }
    const tokenRow = Array.isArray(tokenStatus) ? tokenStatus[0] : null
    const tokenIssuedAt =
      tokenRow &&
      typeof tokenRow === "object" &&
      typeof (tokenRow as { issued_at?: unknown }).issued_at === "string"
        ? (tokenRow as { issued_at: string }).issued_at
        : null

    return {
      ok: true,
      settings: {
        person: signedInPerson(session.person),
        config: config.value,
        people: people.value,
        tokenIssuedAt,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { ok: false, kind: "error", error: `Could not reach Supabase. ${message}` }
  }
}

export type ProfilePage = {
  person: SignedInPerson
  profile: PersonProfile
}

export type ProfileLoadResult =
  | { ok: true; page: ProfilePage }
  | { ok: false; kind: "redirect" }
  | { ok: false; kind: "error"; error: string }

export async function loadMyProfile(): Promise<ProfileLoadResult> {
  try {
    const session = await loadSessionPerson()
    if (!session.ok) {
      return asPageFailure(session)
    }

    const profile = await createHouseholdReads(
      session.client,
      session.person.householdId,
    ).profile(session.person.id)
    if (!profile.ok) {
      return { ok: false, kind: "error", error: profile.error }
    }

    return {
      ok: true,
      page: {
        person: signedInPerson(session.person),
        profile: profile.value,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { ok: false, kind: "error", error: `Could not reach Supabase. ${message}` }
  }
}

