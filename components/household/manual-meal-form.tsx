"use client"

import { useActionState } from "react"
import { logMyMeal, type MealFormState } from "@/app/actions/meals"
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
import { Textarea } from "@/components/ui/textarea"

const initialState: MealFormState = { error: null }

export function ManualMealForm() {
  const [state, formAction, pending] = useActionState(logMyMeal, initialState)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Log a meal</CardTitle>
        <CardDescription>
          Human-only entry. Nutrition is optional, but calories, protein, carbs,
          and fat must be entered together.
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
            <Label htmlFor="meal-description">What did you eat?</Label>
            <Textarea id="meal-description" name="description" required rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="meal-calories">Calories</Label>
              <Input id="meal-calories" name="calories" type="number" min={0} step="any" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="meal-protein">Protein (g)</Label>
              <Input id="meal-protein" name="proteinG" type="number" min={0} step="any" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="meal-carbs">Carbs (g)</Label>
              <Input id="meal-carbs" name="carbsG" type="number" min={0} step="any" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="meal-fat">Fat (g)</Label>
              <Input id="meal-fat" name="fatG" type="number" min={0} step="any" />
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Logging…" : "Log meal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
