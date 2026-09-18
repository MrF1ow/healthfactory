import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DayMealItem, DayMeals } from "@/lib/household/day-board"

function formatLoggedAt(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  })
}

function macroSummary(item: Extract<DayMealItem, { kind: "counted" }>): string {
  const { nutrition } = item
  return `${nutrition.calories} kcal · ${nutrition.proteinG}g protein · ${nutrition.carbsG}g carbs · ${nutrition.fatG}g fat`
}

function MealRow({ item }: { item: DayMealItem }) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="font-medium">{item.description}</span>
      <span className="text-muted-foreground">
        {item.source} · {formatLoggedAt(item.loggedAt)}
        {item.kind === "counted" ? ` · ${macroSummary(item)}` : " · no macros"}
      </span>
    </li>
  )
}

export function TodayMealsCard({ meals }: { meals: DayMeals }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Today&apos;s meals</CardTitle>
        {meals.kind === "truncated" ? (
          <CardDescription>
            Showing the latest {meals.cap} meals today.
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {meals.kind === "empty" ? (
          <p className="text-sm text-muted-foreground">No meals logged today.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-sm">
            {meals.items.map((item) => (
              <MealRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
