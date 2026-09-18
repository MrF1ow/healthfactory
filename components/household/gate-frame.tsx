import type { ReactNode } from "react"
import { SetupHouseholdForm } from "@/components/household/setup-household-form"
import { SignInForm } from "@/components/household/sign-in-form"
import {
  BlockedPanel,
  UnconfiguredPanel,
} from "@/components/household/status-panels"
import type { GateScreen } from "@/lib/household/load"

export function GateFrame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-8 text-center">
        <p className="text-sm text-muted-foreground">Health Factory</p>
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Household
        </h1>
      </div>
      {children}
    </main>
  )
}

export function gateBody(screen: GateScreen) {
  switch (screen.kind) {
    case "unconfigured":
      return <UnconfiguredPanel />
    case "setup":
      return <SetupHouseholdForm hasSession={screen.hasSession} />
    case "login":
      return <SignInForm />
    case "blocked":
      return <BlockedPanel message={screen.message} />
  }
}
