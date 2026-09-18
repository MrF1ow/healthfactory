import { describe, expect, it } from "vitest"
import { generateMcpToken, hashMcpToken, mcpTokenHashParam, parseBearer } from "./token"

const KNOWN_PLAINTEXT = "hf_mcp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
const KNOWN_DIGEST = [
  188, 6, 88, 123, 207, 210, 242, 247, 34, 121, 179, 172, 12, 75, 2, 87, 7, 61,
  123, 132, 27, 3, 189, 0, 46, 204, 12, 225, 209, 18, 171, 221,
] as const

describe("generateMcpToken", () => {
  it("returns hf_mcp_ plus 32 random bytes as unpadded base64url", () => {
    const token = generateMcpToken()
    expect(token).toMatch(/^hf_mcp_[A-Za-z0-9_-]{43}$/)
    expect(Buffer.from(token.slice("hf_mcp_".length), "base64url").length).toBe(32)
  })

  it("returns a different token on each call", () => {
    expect(generateMcpToken()).not.toBe(generateMcpToken())
  })
})

describe("hashMcpToken", () => {
  it("returns the SHA-256 digest of the full plaintext", () => {
    expect(Array.from(hashMcpToken(KNOWN_PLAINTEXT))).toEqual([...KNOWN_DIGEST])
  })
})

describe("mcpTokenHashParam", () => {
  it("encodes the digest as a PostgREST bytea hex literal", () => {
    expect(mcpTokenHashParam(hashMcpToken(KNOWN_PLAINTEXT))).toBe(
      "\\xbc06587bcfd2f2f72279b3ac0c4b0257073d7b841b03bd002ecc0ce1d112abdd",
    )
  })
})

describe("parseBearer", () => {
  it("returns the token after a Bearer scheme", () => {
    expect(parseBearer(`Bearer ${KNOWN_PLAINTEXT}`)).toBe(KNOWN_PLAINTEXT)
  })

  it("accepts a case-insensitive Bearer scheme", () => {
    expect(parseBearer(`bearer ${KNOWN_PLAINTEXT}`)).toBe(KNOWN_PLAINTEXT)
  })

  it("returns null when the header is missing or not Bearer", () => {
    expect(parseBearer(null)).toBe(null)
    expect(parseBearer("Basic abc")).toBe(null)
    expect(parseBearer("Bearer")).toBe(null)
    expect(parseBearer("Bearer ")).toBe(null)
  })
})
