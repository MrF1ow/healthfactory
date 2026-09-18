import {
  createMcpHandler,
  fromJsonSchema,
  McpServer,
  ProtocolError,
  ProtocolErrorCode,
  ResourceNotFoundError,
  ResourceTemplate,
} from "@modelcontextprotocol/server"
import type { HouseholdReads } from "@/lib/household/reads"
import type { HouseholdWrites, WriteResult } from "@/lib/household/writes"
import { parseBearer } from "@/lib/mcp/token"
import { parseMcpUri } from "@/lib/mcp/uris"

export const MCP_LOG_LIMIT = 100

type HouseholdMcpHandler = ReturnType<typeof createMcpHandler>

function jsonResource(uri: URL, value: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json" as const,
        text: JSON.stringify(value),
      },
    ],
  }
}

function throwReadError(uri: URL, error: string): never {
  if (error === "Not found.") {
    throw new ResourceNotFoundError(uri.href)
  }
  throw new ProtocolError(ProtocolErrorCode.InternalError, error)
}

function householdIdFromAuth(authInfo: { extra?: Record<string, unknown> } | undefined) {
  const householdId = authInfo?.extra?.householdId
  if (typeof householdId !== "string" || !householdId) {
    throw new ProtocolError(
      ProtocolErrorCode.InvalidRequest,
      "MCP household scope is missing.",
    )
  }
  return householdId
}

function personIdArg(args: { person_id?: unknown }) {
  return typeof args.person_id === "string" ? args.person_id : ""
}

function toolJson(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value,
  }
}

function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  }
}

async function toolResult<T>(result: WriteResult<T>) {
  if (!result.ok) {
    return toolError(result.error)
  }
  return toolJson(result.value)
}

const personIdProperty = { type: "string" as const }

export function createHouseholdMcpHandler(
  bind: (householdId: string) => {
    reads: HouseholdReads
    writes: HouseholdWrites
  },
): HouseholdMcpHandler {
  return createMcpHandler(({ authInfo }) => {
    const householdId = householdIdFromAuth(authInfo)
    const { reads, writes } = bind(householdId)
    const server = new McpServer({ name: "healthfactory", version: "0.1.0" })

    server.registerResource(
      "config",
      "household://config",
      {
        title: "Household config",
        description: "Shared household configuration",
        mimeType: "application/json",
      },
      async (uri) => {
        const result = await reads.config()
        if (!result.ok) {
          throwReadError(uri, result.error)
        }
        return jsonResource(uri, result.value)
      },
    )

    server.registerResource(
      "profile",
      new ResourceTemplate("person://{person_id}/profile", { list: undefined }),
      {
        title: "Person profile",
        description: "Profile for one household member",
        mimeType: "application/json",
      },
      async (uri, { person_id }) => {
        const result = await reads.profile(String(person_id))
        if (!result.ok) {
          throwReadError(uri, result.error)
        }
        return jsonResource(uri, result.value)
      },
    )

    const logMeta = {
      title: "Person meal log",
      description: "Meal log for one household member",
      mimeType: "application/json",
    }
    const readLog = async (
      uri: URL,
      variables: Record<string, string | string[]>,
    ) => {
      const parsed = parseMcpUri(uri.href)
      const since = parsed.kind === "log" ? parsed.since : null
      const result = await reads.log(String(variables.person_id ?? ""), {
        since,
        limit: MCP_LOG_LIMIT,
      })
      if (!result.ok) {
        throwReadError(uri, result.error)
      }
      return jsonResource(uri, result.value)
    }
    // UriTemplate match is end-anchored, so a query string needs its own pattern.
    server.registerResource(
      "log",
      new ResourceTemplate("person://{person_id}/log", { list: undefined }),
      logMeta,
      readLog,
    )
    server.registerResource(
      "log-since",
      new ResourceTemplate("person://{person_id}/log{?since}", { list: undefined }),
      logMeta,
      readLog,
    )

    server.registerTool(
      "update_macro_targets",
      {
        title: "Update macro targets",
        description: "Set one household member's calorie and macro targets",
        inputSchema: fromJsonSchema<{ person_id: string; targets: unknown }>({
          type: "object",
          properties: {
            person_id: personIdProperty,
            targets: {
              type: "object",
              properties: {
                calories: { type: "number" },
                proteinG: { type: "number" },
                carbsG: { type: "number" },
                fatG: { type: "number" },
                method: { type: "string" },
              },
            },
          },
          required: ["person_id", "targets"],
        }),
      },
      async (args) =>
        toolResult(
          await writes.updateMacroTargets(personIdArg(args), args.targets),
        ),
    )

    server.registerTool(
      "update_preferences",
      {
        title: "Update preferences",
        description: "Merge one household member's preference lists",
        inputSchema: fromJsonSchema<{ person_id: string; patch: unknown }>({
          type: "object",
          properties: {
            person_id: personIdProperty,
            patch: {
              type: "object",
              properties: {
                dietaryRestrictions: { type: "array", items: { type: "string" } },
                allergies: { type: "array", items: { type: "string" } },
                likes: { type: "array", items: { type: "string" } },
                dislikes: { type: "array", items: { type: "string" } },
                notes: { type: ["string", "null"] },
              },
            },
          },
          required: ["person_id", "patch"],
        }),
      },
      async (args) =>
        toolResult(await writes.updatePreferences(personIdArg(args), args.patch)),
    )

    server.registerTool(
      "log_meal",
      {
        title: "Log meal",
        description: "Append a bot meal log entry for one household member",
        inputSchema: fromJsonSchema<{ person_id: string; entry: unknown }>({
          type: "object",
          properties: {
            person_id: personIdProperty,
            entry: {
              type: "object",
              properties: {
                description: { type: "string" },
                nutrition: {
                  type: "object",
                  properties: {
                    calories: { type: "number" },
                    proteinG: { type: "number" },
                    carbsG: { type: "number" },
                    fatG: { type: "number" },
                  },
                },
              },
              required: ["description"],
            },
          },
          required: ["person_id", "entry"],
        }),
      },
      async (args) => toolResult(await writes.logMeal(personIdArg(args), args.entry)),
    )

    server.registerTool(
      "update_household_config",
      {
        title: "Update household config",
        description: "Merge household name, recipe places, or shared preferences",
        inputSchema: fromJsonSchema<{ patch: unknown }>({
          type: "object",
          properties: {
            patch: {
              type: "object",
              properties: {
                name: { type: "string" },
                fridgeLocations: { type: "array", items: { type: "string" } },
                recipeSearchPlaces: { type: "array" },
                preferences: { type: "object" },
              },
            },
          },
          required: ["patch"],
        }),
      },
      async (args) => toolResult(await writes.updateHouseholdConfig(args.patch)),
    )

    server.registerTool(
      "update_fridge_locations",
      {
        title: "Update fridge locations",
        description: "Replace the household fridge and freezer location list",
        inputSchema: fromJsonSchema<{ locations: unknown }>({
          type: "object",
          properties: {
            locations: { type: "array", items: { type: "string" } },
          },
          required: ["locations"],
        }),
      },
      async (args) => toolResult(await writes.updateFridgeLocations(args)),
    )

    return server
  })
}

export async function handleMcpRequest(
  handler: HouseholdMcpHandler,
  request: Request,
  resolveToken: (token: string) => Promise<string | null>,
): Promise<Response> {
  const token = parseBearer(request.headers.get("authorization"))
  if (!token) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer" },
    })
  }
  const householdId = await resolveToken(token)
  if (!householdId) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer" },
    })
  }
  return handler.fetch(request, {
    authInfo: {
      token,
      clientId: householdId,
      scopes: [],
      extra: { householdId },
    },
  })
}
