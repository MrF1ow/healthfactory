import Link from "next/link"
import { redirect } from "next/navigation"
import { AddMemberForm } from "@/components/household/add-member-form"
import { HouseholdSettingsForm } from "@/components/household/household-settings-form"
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
      <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-16">
        <LoadErrorPanel message={result.error} />
      </main>
    )
  }

  const { settings } = result

  return (
    <main className="flex min-h-full flex-1 flex-col items-center bg-background px-4 py-16">
      <div className="mb-8 w-full max-w-2xl text-left">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            Household
          </Link>
        </p>
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {settings.person.name} ({settings.person.role}).
        </p>
      </div>
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
      </div>
    </main>
  )
}
