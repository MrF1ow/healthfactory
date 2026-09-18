import Link from "next/link"
import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { SignedInPerson } from "@/lib/household/screen"

export function HomePanel({ person }: { person: SignedInPerson }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{person.householdName}</CardTitle>
        <CardDescription>
          Signed in as {person.name} ({person.role}).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Household config is shared. Macros and personal preferences stay on
          each person&apos;s own profile.
        </p>
        <Button asChild>
          <Link href="/settings">Household settings</Link>
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
