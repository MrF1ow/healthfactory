import { redirect } from "next/navigation"
import { PersonProfileForm } from "@/components/household/person-profile-form"
import { GateFrame } from "@/components/household/gate-frame"
import { SignedInShell } from "@/components/household/signed-in-shell"
import { LoadErrorPanel } from "@/components/household/status-panels"
import { loadMyProfile } from "@/lib/household/load"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const result = await loadMyProfile()
  if (!result.ok) {
    if (result.kind === "redirect") {
      redirect("/")
    }
    return (
      <GateFrame>
        <LoadErrorPanel message={result.error} />
      </GateFrame>
    )
  }

  const { page } = result

  return (
    <SignedInShell current="profile" person={page.person}>
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          Only you can edit this profile.
        </p>
        <PersonProfileForm profile={page.profile} />
      </div>
    </SignedInShell>
  )
}
