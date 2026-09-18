"use client"

import { useActionState } from "react"
import { updateMyProfile, type ProfileFormState } from "@/app/actions/profile"
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
import {
  ACTIVITY_LEVELS,
  CHECK_IN_CADENCES,
  SEX_VALUES,
  type PersonProfile,
} from "@/lib/household/profile"

const initialState: ProfileFormState = { error: null }

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none md:text-sm dark:bg-input/30"

function numberField(value: number | null): string {
  return value === null ? "" : String(value)
}

export function PersonProfileForm({ profile }: { profile: PersonProfile }) {
  const [state, formAction, pending] = useActionState(updateMyProfile, initialState)
  const amounts = profile.macroTargets?.amounts

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Demographics</CardTitle>
          <CardDescription>Used for your own records and later bot context.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              name="age"
              type="number"
              min={1}
              step={1}
              defaultValue={numberField(profile.ageYears)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sex">Sex</Label>
            <select
              id="sex"
              name="sex"
              defaultValue={profile.sex ?? ""}
              className={selectClassName}
            >
              <option value="">Not set</option>
              {SEX_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="heightCm">Height (cm)</Label>
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              min={0}
              step="any"
              defaultValue={numberField(profile.heightCm)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="weightKg">Weight (kg)</Label>
            <Input
              id="weightKg"
              name="weightKg"
              type="number"
              min={0}
              step="any"
              defaultValue={numberField(profile.weightKg)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="activityLevel">Activity level</Label>
            <select
              id="activityLevel"
              name="activityLevel"
              defaultValue={profile.activityLevel ?? ""}
              className={selectClassName}
            >
              <option value="">Not set</option>
              {ACTIVITY_LEVELS.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Macro targets</CardTitle>
          <CardDescription>
            Enter calories, protein, carbs, and fat together. Saves as a manual
            target.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="calories">Calories</Label>
            <Input
              id="calories"
              name="calories"
              type="number"
              min={0}
              step="any"
              defaultValue={numberField(amounts?.calories ?? null)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="proteinG">Protein (g)</Label>
            <Input
              id="proteinG"
              name="proteinG"
              type="number"
              min={0}
              step="any"
              defaultValue={numberField(amounts?.proteinG ?? null)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="carbsG">Carbs (g)</Label>
            <Input
              id="carbsG"
              name="carbsG"
              type="number"
              min={0}
              step="any"
              defaultValue={numberField(amounts?.carbsG ?? null)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fatG">Fat (g)</Label>
            <Input
              id="fatG"
              name="fatG"
              type="number"
              min={0}
              step="any"
              defaultValue={numberField(amounts?.fatG ?? null)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>One item per line. Notes are free text.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dietaryRestrictions">Dietary restrictions</Label>
            <Textarea
              id="dietaryRestrictions"
              name="dietaryRestrictions"
              rows={3}
              defaultValue={profile.preferences.dietaryRestrictions.join("\n")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              name="allergies"
              rows={3}
              defaultValue={profile.preferences.allergies.join("\n")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="likes">Likes</Label>
            <Textarea
              id="likes"
              name="likes"
              rows={3}
              defaultValue={profile.preferences.likes.join("\n")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dislikes">Dislikes</Label>
            <Textarea
              id="dislikes"
              name="dislikes"
              rows={3}
              defaultValue={profile.preferences.dislikes.join("\n")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={profile.preferences.notes ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Bot settings</CardTitle>
          <CardDescription>
            Personal check-in cadence and guidance. Bots are not wired in this
            step.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="checkInCadence">Check-in cadence</Label>
            <select
              id="checkInCadence"
              name="checkInCadence"
              defaultValue={profile.botConfig.checkInCadence}
              className={selectClassName}
            >
              {CHECK_IN_CADENCES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="guidance">Guidance</Label>
            <Textarea
              id="guidance"
              name="guidance"
              rows={3}
              defaultValue={profile.botConfig.guidance ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  )
}
