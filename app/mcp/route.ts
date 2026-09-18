import { createHouseholdReads } from "@/lib/household/reads"
import { createHouseholdWrites } from "@/lib/household/writes"
import { createHouseholdMcpHandler, handleMcpRequest } from "@/lib/mcp/server"
import { resolveHouseholdMcpToken } from "@/lib/mcp/token"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const handler = createHouseholdMcpHandler((householdId) => {
  const client = createAdminClient()
  return {
    reads: createHouseholdReads(client, householdId),
    writes: createHouseholdWrites(client, householdId, { kind: "service-token" }),
  }
})

async function mcp(request: Request) {
  return handleMcpRequest(handler, request, resolveHouseholdMcpToken)
}

export { mcp as GET, mcp as POST, mcp as DELETE }
