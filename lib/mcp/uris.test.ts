import { describe, expect, it } from "vitest"
import { parseMcpUri } from "./uris"

describe("parseMcpUri", () => {
  it("parses household config", () => {
    expect(parseMcpUri("household://config")).toEqual({ kind: "config" })
  })

  it("parses a person profile", () => {
    expect(parseMcpUri("person://person-alice/profile")).toEqual({
      kind: "profile",
      personId: "person-alice",
    })
  })

  it("parses a person log and the optional since query", () => {
    expect(parseMcpUri("person://person-alice/log")).toEqual({
      kind: "log",
      personId: "person-alice",
      since: null,
    })
    expect(
      parseMcpUri("person://person-alice/log?since=2026-09-10T12:00:00.000Z"),
    ).toEqual({
      kind: "log",
      personId: "person-alice",
      since: "2026-09-10T12:00:00.000Z",
    })
  })

  it("returns unknown for other URIs", () => {
    expect(parseMcpUri("household://members")).toEqual({ kind: "unknown" })
    expect(parseMcpUri("person://person-alice/settings")).toEqual({ kind: "unknown" })
    expect(parseMcpUri("not a uri")).toEqual({ kind: "unknown" })
  })
})
