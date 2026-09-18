import { HomePanel } from "@/components/household/home-panel"
import { GateFrame, gateBody } from "@/components/household/gate-frame"
import { SignedInShell } from "@/components/household/signed-in-shell"
import { LoadErrorPanel } from "@/components/household/status-panels"
import { loadRootView } from "@/lib/household/load"

export const dynamic = "force-dynamic"

export default async function Page() {
  const result = await loadRootView()

  if (!result.ok) {
    return (
      <GateFrame>
        <LoadErrorPanel message={result.error} />
      </GateFrame>
    )
  }

  if (result.view.chrome === "gate") {
    return <GateFrame>{gateBody(result.view.screen)}</GateFrame>
  }

  return (
    <SignedInShell current="home" person={result.view.board.person}>
      <HomePanel board={result.view.board} />
    </SignedInShell>
  )
}
