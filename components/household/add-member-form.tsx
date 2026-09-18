"use client"

import { useActionState, useState } from "react"
import { createMember, type MemberFormState } from "@/app/actions/members"
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

const initialState: MemberFormState = { error: null }

export function AddMemberForm() {
  const [state, formAction, pending] = useActionState(createMember, initialState)
  const [email, setEmail] = useState("")

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add a member</CardTitle>
        <CardDescription>
          Creates the login immediately. No invite email is sent. Enter an
          email, or a username if this person has no email.
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
            <Label htmlFor="member-name">Name</Label>
            <Input id="member-name" name="name" required autoComplete="name" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-username">Username</Label>
            <Input
              id="member-username"
              name="username"
              autoComplete="username"
              required={email.trim() === ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-password">Password</Label>
            <Input
              id="member-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding member…" : "Add member"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
