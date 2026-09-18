import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  NUTRIENT_LABEL,
  NUTRIENTS,
  type DayBoard,
  type NutrientBar,
} from "@/lib/household/day-board"
import { utcDayLabel } from "@/lib/household/utc-day"

function formatMacroValue(
  nutrient: (typeof NUTRIENTS)[number],
  value: number,
): string {
  if (nutrient === "calories") {
    return `${value} kcal`
  }
  return `${value} g`
}

function RatioBarRow({
  nutrient,
  label,
  bar,
}: {
  nutrient: (typeof NUTRIENTS)[number]
  label: string
  bar: Extract<NutrientBar, { kind: "ratio" }>
}) {
  const remainingLabel =
    bar.remaining >= 0
      ? `${formatMacroValue(nutrient, bar.remaining)} remaining`
      : `${formatMacroValue(nutrient, Math.abs(bar.remaining))} over`
  const unitSuffix = nutrient === "calories" ? " kcal" : " g"

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {bar.logged}
          {unitSuffix} / {bar.target}
          {unitSuffix}
        </span>
      </div>
      <Progress value={Math.min(100, bar.fraction * 100)} />
      <p className="text-xs text-muted-foreground">{remainingLabel}</p>
    </div>
  )
}

function ZeroTargetRow({
  nutrient,
  label,
  bar,
}: {
  nutrient: (typeof NUTRIENTS)[number]
  label: string
  bar: Extract<NutrientBar, { kind: "zero-target" }>
}) {
  const unitSuffix = nutrient === "calories" ? " kcal" : " g"
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">
        {bar.logged}
        {unitSuffix} · no target
      </span>
    </div>
  )
}

export function TodayProgressCard({ board }: { board: DayBoard }) {
  const { progress, meals } = board

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Today · {utcDayLabel(board.day)}</CardTitle>
        {progress.kind === "tracking" ? (
          <CardDescription>
            Targets are{" "}
            {progress.method === "manual" ? "manual" : "calculated by a bot"}.
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {progress.kind === "no-targets" ? (
          <>
            <div className="grid gap-2 text-sm">
              {NUTRIENTS.map((nutrient) => (
                <div key={nutrient} className="flex justify-between">
                  <span>{NUTRIENT_LABEL[nutrient]}</span>
                  <span className="text-muted-foreground">
                    {formatMacroValue(nutrient, progress.logged[nutrient])}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Set your macros on your profile.
            </p>
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href="/profile">My profile</Link>
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {NUTRIENTS.map((nutrient) => {
              const bar = progress.bars[nutrient]
              if (bar.kind === "zero-target") {
                return (
                  <ZeroTargetRow
                    key={nutrient}
                    nutrient={nutrient}
                    label={NUTRIENT_LABEL[nutrient]}
                    bar={bar}
                  />
                )
              }
              return (
                <RatioBarRow
                  key={nutrient}
                  nutrient={nutrient}
                  label={NUTRIENT_LABEL[nutrient]}
                  bar={bar}
                />
              )
            })}
          </div>
        )}
        {meals.kind === "truncated" ? (
          <p className="text-sm text-muted-foreground">
            Totals may be a lower bound. Only the latest {meals.cap} meals today
            are included.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
