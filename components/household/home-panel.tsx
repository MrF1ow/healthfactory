import { ManualMealForm } from "@/components/household/manual-meal-form"
import { HouseholdGlanceCard } from "@/components/household/household-glance-card"
import { TodayMealsCard } from "@/components/household/today-meals-card"
import { TodayProgressCard } from "@/components/household/today-progress-card"
import type { DayBoard } from "@/lib/household/day-board"

export function HomePanel({ board }: { board: DayBoard }) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <TodayProgressCard board={board} />
      <ManualMealForm />
      <TodayMealsCard meals={board.meals} />
      <HouseholdGlanceCard glance={board.household} />
    </div>
  )
}
