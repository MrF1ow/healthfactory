import { redirect } from "next/navigation"
import { AddMemberForm } from "@/components/household/add-member-form"
import { HouseholdSettingsForm } from "@/components/household/household-settings-form"
import { McpTokenCard } from "@/components/household/mcp-token-card"
import { GateFrame } from "@/components/household/gate-frame"
import { SignedInShell } from "@/components/household/signed-in-shell"
import { LoadErrorPanel } from "@/components/household/status-panels"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { loadHouseholdSettings } from "@/lib/household/load"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const result = await loadHouseholdSettings()
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

  const { settings } = result

  return (
    <SignedInShell current="settings" person={settings.person}>
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <HouseholdSettingsForm config={settings.config} />
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Everyone who can sign in to this household.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {settings.people.map((person) => (
                <li key={person.id}>
                  {person.name} ({person.role})
                  {person.email ? ` · ${person.email}` : " · no email"}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <AddMemberForm />
        <McpTokenCard issuedAt={settings.tokenIssuedAt} />
      </div>
    </SignedInShell>
  )
}
