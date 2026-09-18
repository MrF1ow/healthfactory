"use client"

import { useActionState } from "react"
import {
  initialMcpTokenFormState,
  issueHouseholdMcpToken,
} from "@/app/actions/mcp"
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

export function McpTokenCard({ issuedAt }: { issuedAt: string | null }) {
  const [state, formAction, pending] = useActionState(
    issueHouseholdMcpToken,
    initialMcpTokenFormState,
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>MCP token</CardTitle>
        <CardDescription>
          Issues a household token for read-only config, profile, and meal log
          access. Replacing a token invalidates the previous one.
          {issuedAt ? ` Last issued ${issuedAt}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state.ok && state.plaintext ? (
            <>
              <Alert>
                <AlertDescription>
                  Copy this token now. It is shown once.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mcp-token">Token</Label>
                <Input
                  id="mcp-token"
                  readOnly
                  value={state.plaintext}
                />
              </div>
            </>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending
              ? "Issuing…"
              : issuedAt || state.ok
                ? "Replace token"
                : "Issue token"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
