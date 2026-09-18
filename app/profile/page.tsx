import Link from "next/link"
import { redirect } from "next/navigation"
import { PersonProfileForm } from "@/components/household/person-profile-form"
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
      <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-16">
        <LoadErrorPanel message={result.error} />
      </main>
    )
  }

  const { page } = result

  return (
    <main className="flex min-h-full flex-1 flex-col items-center bg-background px-4 py-16">
      <div className="mb-8 w-full max-w-2xl text-left">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            Household
          </Link>
          {" · "}
          <Link href="/settings" className="underline-offset-4 hover:underline">
            Settings
          </Link>
        </p>
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          My profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {page.person.name} ({page.person.role}). Only you can
          edit this profile.
        </p>
      </div>
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PersonProfileForm profile={page.profile} />
      </div>
    </main>
  )
}
