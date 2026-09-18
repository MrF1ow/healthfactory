import { createHash, randomBytes } from "node:crypto"
import { publicSupabaseEnv, serviceRoleKey } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"

const PREFIX = "hf_mcp_"

export function generateMcpToken(): string {
  return `${PREFIX}${randomBytes(32).toString("base64url")}`
}

export function hashMcpToken(plaintext: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(plaintext).digest())
}

export function mcpTokenHashHex(hash: Uint8Array): string {
  return Buffer.from(hash).toString("hex")
}

export function parseBearer(header: string | null): string | null {
  if (!header) {
    return null
  }
  const match = /^Bearer (\S+)$/i.exec(header.trim())
  return match?.[1] ?? null
}

export async function resolveHouseholdMcpToken(plaintext: string): Promise<string | null> {
  if (!publicSupabaseEnv() || !serviceRoleKey()) {
    return null
  }
  const admin = createAdminClient()
  const { data, error } = await admin.rpc("resolve_household_mcp_token", {
    p_token_hash_hex: mcpTokenHashHex(hashMcpToken(plaintext)),
  })
  if (error || typeof data !== "string" || !data) {
    return null
  }
  return data
}
