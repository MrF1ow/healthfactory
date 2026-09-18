"use server"

import { publicSupabaseEnv } from "@/lib/env"
import { loadSessionPerson } from "@/lib/household/load"
import { generateMcpToken, hashMcpToken, mcpTokenHashParam } from "@/lib/mcp/token"

export type McpTokenFormState = {
  ok: boolean
  error: string | null
  plaintext: string | null
}

export const initialMcpTokenFormState: McpTokenFormState = {
  ok: false,
  error: null,
  plaintext: null,
}

export async function issueHouseholdMcpToken(): Promise<McpTokenFormState> {
  if (!publicSupabaseEnv()) {
    return {
      ok: false,
      error:
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
      plaintext: null,
    }
  }

  const session = await loadSessionPerson()
  if (!session.ok) {
    if (session.kind === "error") {
      return { ok: false, error: session.error, plaintext: null }
    }
    return {
      ok: false,
      error: "Sign in to issue an MCP token.",
      plaintext: null,
    }
  }

  const plaintext = generateMcpToken()
  const { data, error } = await session.client.rpc("rotate_household_mcp_token", {
    p_token_hash: mcpTokenHashParam(hashMcpToken(plaintext)),
  })
  if (error) {
    return { ok: false, error: error.message, plaintext: null }
  }
  if (typeof data !== "string" || !data) {
    return { ok: false, error: "Could not issue MCP token.", plaintext: null }
  }

  return { ok: true, error: null, plaintext }
}
