import { signOut } from "@/app/actions/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function UnconfiguredPanel() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Point this app at your Supabase project</CardTitle>
        <CardDescription>
          Copy .env.example to .env.local and fill in the three keys. Then apply
          supabase/migrations to that project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
          <li>SUPABASE_SERVICE_ROLE_KEY</li>
        </ul>
      </CardContent>
    </Card>
  )
}

export function LoadErrorPanel({ message }: { message: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Cannot load the household</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertTitle>Supabase error</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

export function BlockedPanel({ message }: { message: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>No household access</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
