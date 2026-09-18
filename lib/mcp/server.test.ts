import { afterEach, describe, expect, it } from "vitest"
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"
import type { HouseholdReads } from "@/lib/household/reads"
import type { HouseholdWrites } from "@/lib/household/writes"
import { mealPayloadFromUnknown } from "@/lib/household/meal"
import { parseMacroTargetsFromUnknown } from "@/lib/household/profile"
import {
  createHouseholdMcpHandler,
  handleMcpRequest,
} from "./server"

const aliceProfile = {
  ageYears: null,
  sex: null,
  heightCm: null,
  weightKg: null,
  activityLevel: null,
  macroTargets: null,
  preferences: {
    schemaVersion: 1 as const,
    dietaryRestrictions: [],
    allergies: [],
    likes: [],
    dislikes: [],
    notes: null,
  },
  botConfig: {
    schemaVersion: 1 as const,
    checkInCadence: "off" as const,
    guidance: null,
  },
}

const householdConfig = {
  name: "The Flow House",
  fridgeLocations: ["kitchen fridge"],
  recipeSearchPlaces: [
    { name: "H-E-B", type: "grocery" as const, url: "https://www.heb.com" },
  ],
  preferences: {
    constraints: ["no pork"],
    budget: "$150/week",
    shoppingCadence: "Sundays",
  },
}

const oatmeal = {
  id: "meal-oatmeal",
  personId: "person-alice",
  loggedAt: "2026-09-18T12:00:00.000Z",
  source: "human" as const,
  payload: {
    schemaVersion: 1 as const,
    kind: "meal" as const,
    description: "Oatmeal",
    nutrition: null,
  },
}

const salad = {
  id: "meal-salad",
  personId: "person-alice",
  loggedAt: "2026-09-10T12:00:00.000Z",
  source: "human" as const,
  payload: {
    schemaVersion: 1 as const,
    kind: "meal" as const,
    description: "Salad",
    nutrition: null,
  },
}

const reads: HouseholdReads = {
  async config() {
    return { ok: true, value: householdConfig }
  },
  async members() {
    return { ok: true, value: [] }
  },
  async profile(personId) {
    if (personId !== "person-alice") {
      return { ok: false, error: "Not found." }
    }
    return { ok: true, value: aliceProfile }
  },
  async log(personId, query) {
    if (personId !== "person-alice") {
      return { ok: false, error: "Not found." }
    }
    if (query.limit !== 100) {
      return { ok: false, error: `limit was ${query.limit}` }
    }
    if (query.since === "2026-09-10T12:00:00.000Z") {
      return { ok: true, value: { entries: [salad], truncated: false } }
    }
    return { ok: true, value: { entries: [oatmeal, salad], truncated: false } }
  },
}

const writes: HouseholdWrites = {
  async replaceConfig(config) {
    return { ok: true, value: config }
  },
  async replaceProfile(personId) {
    return { ok: true, value: { personId } }
  },
  async updateMacroTargets(personId, input) {
    if (personId !== "person-alice") {
      return { ok: false, error: "Not found." }
    }
    return parseMacroTargetsFromUnknown(input)
  },
  async updatePreferences(personId, patch) {
    if (personId !== "person-alice") {
      return { ok: false, error: "Not found." }
    }
    if (!patch || typeof patch !== "object") {
      return { ok: false, error: "Preferences must be an object." }
    }
    return {
      ok: true,
      value: {
        ...aliceProfile.preferences,
        ...(patch as { dislikes?: string[] }),
      },
    }
  },
  async logMeal(personId, entry) {
    if (personId !== "person-alice") {
      return { ok: false, error: "Not found." }
    }
    const payload = mealPayloadFromUnknown(entry)
    if (!payload.ok) {
      return payload
    }
    return {
      ok: true,
      value: {
        id: "meal-new",
        personId,
        loggedAt: "2026-09-18T15:00:00.000Z",
        source: "bot",
        payload: payload.value,
      },
    }
  },
  async updateHouseholdConfig(patch) {
    if (!patch || typeof patch !== "object") {
      return { ok: false, error: "Household config must be an object." }
    }
    return {
      ok: true,
      value: { ...householdConfig, ...(patch as { name?: string }) },
    }
  },
  async updateFridgeLocations(input) {
    const locations = (input as { locations?: unknown }).locations
    if (!Array.isArray(locations)) {
      return { ok: false, error: "Fridge locations must be a list of names." }
    }
    return { ok: true, value: locations as string[] }
  },
}

const householdAuth = {
  token: "hf_mcp_test",
  clientId: "house-a",
  scopes: [] as string[],
  extra: { householdId: "house-a" },
}

function resourceJson(result: {
  contents: ReadonlyArray<{ text?: string; blob?: string }>
}) {
  const text = result.contents[0]?.text
  if (typeof text !== "string") {
    throw new Error("resource had no text")
  }
  return JSON.parse(text)
}

describe("household MCP server", () => {
  let client: Client | undefined
  let handler: ReturnType<typeof createHouseholdMcpHandler> | undefined

  afterEach(async () => {
    await client?.close()
    await handler?.close()
    client = undefined
    handler = undefined
  })

  async function connect() {
    handler = createHouseholdMcpHandler(() => ({ reads, writes }))
    const transport = new StreamableHTTPClientTransport(new URL("http://test.local/mcp"), {
      fetch: (url, init) =>
        handler!.fetch(new Request(url, init), { authInfo: householdAuth }),
    })
    client = new Client(
      { name: "test-harness", version: "1.0.0" },
      { versionNegotiation: { mode: "auto" } },
    )
    await client.connect(transport)
    return client
  }

  it("serves household config, person profile, and person log as domain JSON", async () => {
    const mcp = await connect()
    expect(resourceJson(await mcp.readResource({ uri: "household://config" }))).toEqual(
      householdConfig,
    )
    expect(
      resourceJson(await mcp.readResource({ uri: "person://person-alice/profile" })),
    ).toEqual(aliceProfile)
    expect(
      resourceJson(await mcp.readResource({ uri: "person://person-alice/log" })),
    ).toEqual({ entries: [oatmeal, salad], truncated: false })
    expect(
      resourceJson(
        await mcp.readResource({
          uri: "person://person-alice/log?since=2026-09-10T12:00:00.000Z",
        }),
      ),
    ).toEqual({ entries: [salad], truncated: false })
  })

  it("returns not found for a person outside the household", async () => {
    const mcp = await connect()
    await expect(
      mcp.readResource({ uri: "person://person-bob/profile" }),
    ).rejects.toMatchObject({
      message: "Resource not found: person://person-bob/profile",
    })
  })

  it("registers the five write tools and logs meals as bot", async () => {
    const mcp = await connect()
    expect((await mcp.listTools()).tools.map((tool) => tool.name).sort()).toEqual([
      "log_meal",
      "update_fridge_locations",
      "update_household_config",
      "update_macro_targets",
      "update_preferences",
    ])
    const meal = await mcp.callTool({
      name: "log_meal",
      arguments: {
        person_id: "person-alice",
        entry: { description: "Oatmeal" },
      },
    })
    expect(meal.isError).toBeUndefined()
    expect(meal.structuredContent).toEqual({
      id: "meal-new",
      personId: "person-alice",
      loggedAt: "2026-09-18T15:00:00.000Z",
      source: "bot",
      payload: {
        schemaVersion: 1,
        kind: "meal",
        description: "Oatmeal",
        nutrition: null,
      },
    })
    const macros = await mcp.callTool({
      name: "update_macro_targets",
      arguments: {
        person_id: "person-alice",
        targets: { calories: 2000, proteinG: 140, carbsG: 200, fatG: 60 },
      },
    })
    expect(macros.structuredContent).toEqual({
      method: "manual",
      amounts: { calories: 2000, proteinG: 140, carbsG: 200, fatG: 60 },
    })
    const missing = await mcp.callTool({
      name: "update_macro_targets",
      arguments: {
        person_id: "person-bob",
        targets: { calories: 2000, proteinG: 140, carbsG: 200, fatG: 60 },
      },
    })
    expect(missing.isError).toBe(true)
    expect(missing.content).toEqual([{ type: "text", text: "Not found." }])
    const prefs = await mcp.callTool({
      name: "update_preferences",
      arguments: {
        person_id: "person-alice",
        patch: { dislikes: ["cilantro"] },
      },
    })
    expect(prefs.structuredContent).toEqual({
      ...aliceProfile.preferences,
      dislikes: ["cilantro"],
    })
    const household = await mcp.callTool({
      name: "update_household_config",
      arguments: { patch: { name: "Flow House" } },
    })
    expect(household.structuredContent).toEqual({
      ...householdConfig,
      name: "Flow House",
    })
    const fridge = await mcp.callTool({
      name: "update_fridge_locations",
      arguments: { locations: ["kitchen fridge", "garage freezer"] },
    })
    expect(fridge.structuredContent).toEqual(["kitchen fridge", "garage freezer"])
    const blankMeal = await mcp.callTool({
      name: "log_meal",
      arguments: { person_id: "person-alice", entry: { description: "  " } },
    })
    expect(blankMeal.isError).toBe(true)
    expect(blankMeal.content).toEqual([{ type: "text", text: "Enter what you ate." }])
  })

  it("rejects requests without a Bearer token", async () => {
    const response = await handleMcpRequest(
      createHouseholdMcpHandler(() => ({ reads, writes })),
      new Request("http://test.local/mcp", { method: "POST" }),
      async () => "house-a",
    )
    expect(response.status).toBe(401)
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer")
  })

  it("rejects a Bearer token that does not resolve to a household", async () => {
    const response = await handleMcpRequest(
      createHouseholdMcpHandler(() => ({ reads, writes })),
      new Request("http://test.local/mcp", {
        method: "POST",
        headers: { Authorization: "Bearer hf_mcp_unknown" },
      }),
      async () => null,
    )
    expect(response.status).toBe(401)
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer")
  })
})
