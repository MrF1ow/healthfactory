import { HomePanel } from "@/components/household/home-panel"
import { SetupHouseholdForm } from "@/components/household/setup-household-form"
import { SignInForm } from "@/components/household/sign-in-form"
import {
  BlockedPanel,
  LoadErrorPanel,
  UnconfiguredPanel,
} from "@/components/household/status-panels"
import { loadDeployScreen, loadRecentMeals } from "@/lib/household/load"

export const dynamic = "force-dynamic"

export default async function Page() {
  const result = await loadDeployScreen()

  let body
  if (!result.ok) {
    body = <LoadErrorPanel message={result.error} />
  } else {
    switch (result.screen.kind) {
      case "unconfigured":
        body = <UnconfiguredPanel />
        break
      case "setup":
        body = <SetupHouseholdForm hasSession={result.screen.hasSession} />
        break
      case "login":
        body = <SignInForm />
        break
      case "home": {
        const meals = await loadRecentMeals(result.screen.person.id)
        body = (
          <HomePanel
            person={result.screen.person}
            meals={meals.ok ? meals.meals : []}
            mealsError={meals.ok ? null : meals.error}
          />
        )
        break
      }
      case "blocked":
        body = <BlockedPanel message={result.screen.message} />
        break
    }
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-8 text-center">
        <p className="text-sm text-muted-foreground">Health Factory</p>
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Household
        </h1>
      </div>
      {body}
    </main>
  )
}
