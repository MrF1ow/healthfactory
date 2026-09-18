import { afterEach, describe, expect, it } from "vitest"
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"
import type { HouseholdReads } from "@/lib/household/reads"
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
    handler = createHouseholdMcpHandler(() => reads)
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

  it("returns not found for a person outside the household and registers no tools", async () => {
    const mcp = await connect()
    await expect(
      mcp.readResource({ uri: "person://person-bob/profile" }),
    ).rejects.toMatchObject({
      message: "Resource not found: person://person-bob/profile",
    })
    expect((await mcp.listTools()).tools).toEqual([])
  })

  it("rejects requests without a Bearer token", async () => {
    const response = await handleMcpRequest(
      createHouseholdMcpHandler(() => reads),
      new Request("http://test.local/mcp", { method: "POST" }),
      async () => "house-a",
    )
    expect(response.status).toBe(401)
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer")
  })

  it("rejects a Bearer token that does not resolve to a household", async () => {
    const response = await handleMcpRequest(
      createHouseholdMcpHandler(() => reads),
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
