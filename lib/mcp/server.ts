import {
  createMcpHandler,
  McpServer,
  ProtocolError,
  ProtocolErrorCode,
  ResourceNotFoundError,
  ResourceTemplate,
} from "@modelcontextprotocol/server"
import type { HouseholdReads } from "@/lib/household/reads"
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

export function createHouseholdMcpHandler(
  readsFor: (householdId: string) => HouseholdReads,
): HouseholdMcpHandler {
  return createMcpHandler(({ authInfo }) => {
    const reads = readsFor(householdIdFromAuth(authInfo))
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
