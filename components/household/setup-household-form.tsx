"use client"

import { useActionState } from "react"
import { bootstrapHousehold, type AuthFormState } from "@/app/actions/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: AuthFormState = { error: null }

export function SetupHouseholdForm({ hasSession }: { hasSession: boolean }) {
  const [state, formAction, pending] = useActionState(bootstrapHousehold, initialState)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set up your household</CardTitle>
        <CardDescription>
          First sign-in creates this deploy&apos;s only household and makes you
          the owner. You can add your wife later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="householdName">Household name</Label>
            <Input
              id="householdName"
              name="householdName"
              required
              autoComplete="organization"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="personName">Your name</Label>
            <Input id="personName" name="personName" required autoComplete="name" />
          </div>
          {hasSession ? null : (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Creating household…" : "Create household"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
