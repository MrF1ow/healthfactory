import { createHash, randomBytes } from "node:crypto"

const PREFIX = "hf_mcp_"

export function generateMcpToken(): string {
  return `${PREFIX}${randomBytes(32).toString("base64url")}`
}

export function hashMcpToken(plaintext: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(plaintext).digest())
}

export function mcpTokenHashParam(hash: Uint8Array): string {
  return `\\x${Buffer.from(hash).toString("hex")}`
}

export function parseBearer(header: string | null): string | null {
  if (!header) {
    return null
  }
  const match = /^Bearer (\S+)$/i.exec(header.trim())
  return match?.[1] ?? null
}
