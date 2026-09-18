"use client"

import { useActionState } from "react"
import { updateHousehold, type HouseholdFormState } from "@/app/actions/household"
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
import type { HouseholdConfig } from "@/lib/household/config"

const initialState: HouseholdFormState = { error: null }

function recipePlacesText(config: HouseholdConfig): string {
  return config.recipeSearchPlaces
    .map((place) => `${place.name} | ${place.type} | ${place.url ?? ""}`)
    .join("\n")
}

export function HouseholdSettingsForm({ config }: { config: HouseholdConfig }) {
  const [state, formAction, pending] = useActionState(updateHousehold, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Household name</CardTitle>
          <CardDescription>Shared by everyone in this deploy.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={config.name} />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Fridge locations</CardTitle>
          <CardDescription>One location per line.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="fridgeLocations">Locations</Label>
          <Textarea
            id="fridgeLocations"
            name="fridgeLocations"
            defaultValue={config.fridgeLocations.join("\n")}
            placeholder={"kitchen fridge\ngarage freezer"}
            rows={4}
          />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recipe search places</CardTitle>
          <CardDescription>
            One place per line as Name | type | url. Types are grocery,
            recipe_site, meal_kit, or other.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="recipeSearchPlaces">Places</Label>
          <Textarea
            id="recipeSearchPlaces"
            name="recipeSearchPlaces"
            defaultValue={recipePlacesText(config)}
            placeholder="H-E-B | grocery | https://www.heb.com"
            rows={4}
          />
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Household preferences</CardTitle>
          <CardDescription>
            Shared constraints, budget, and shopping cadence.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="constraints">Constraints (one per line)</Label>
            <Textarea
              id="constraints"
              name="constraints"
              defaultValue={config.preferences.constraints.join("\n")}
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget">Budget</Label>
            <Input
              id="budget"
              name="budget"
              defaultValue={config.preferences.budget ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shoppingCadence">Shopping cadence</Label>
            <Input
              id="shoppingCadence"
              name="shoppingCadence"
              defaultValue={config.preferences.shoppingCadence ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save household"}
      </Button>
    </form>
  )
}
