import Link from "next/link"
import { signOut } from "@/app/actions/auth"
import { ManualMealForm } from "@/components/household/manual-meal-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { MealLogEntry } from "@/lib/household/meal"
import type { SignedInPerson } from "@/lib/household/screen"

export function HomePanel({
  person,
  meals,
  mealsError,
}: {
  person: SignedInPerson
  meals: MealLogEntry[]
  mealsError: string | null
}) {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Card className="w-full">
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
            <Link href="/profile">My profile</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings">Household settings</Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>

      <ManualMealForm />

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recent meals</CardTitle>
          <CardDescription>Your latest human log entries.</CardDescription>
        </CardHeader>
        <CardContent>
          {mealsError ? (
            <p className="text-sm text-destructive">{mealsError}</p>
          ) : meals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meals logged yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {meals.map((meal) => (
                <li key={meal.id}>
                  {meal.payload.description}
                  {meal.payload.nutrition
                    ? ` · ${meal.payload.nutrition.calories} kcal`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
