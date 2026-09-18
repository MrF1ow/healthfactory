export type McpUri =
  | { kind: "config" }
  | { kind: "profile"; personId: string }
  | { kind: "log"; personId: string; since: string | null }
  | { kind: "unknown" }

export function parseMcpUri(value: string): McpUri {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { kind: "unknown" }
  }

  const path = url.pathname === "/" ? "" : url.pathname
  if (url.protocol === "household:" && url.hostname === "config" && path === "") {
    return { kind: "config" }
  }
  if (url.protocol === "person:" && url.hostname && path === "/profile") {
    return { kind: "profile", personId: url.hostname }
  }
  if (url.protocol === "person:" && url.hostname && path === "/log") {
    const since = url.searchParams.get("since")
    return {
      kind: "log",
      personId: url.hostname,
      since: since ? since : null,
    }
  }
  return { kind: "unknown" }
}
