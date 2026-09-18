import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { HouseholdGlance } from "@/lib/household/day-board"

export function HouseholdGlanceCard({ glance }: { glance: HouseholdGlance }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{glance.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div>
          <p className="font-medium">Fridge locations</p>
          {glance.fridgeLocations.length === 0 ? (
            <p className="text-muted-foreground">No fridge locations yet.</p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {glance.fridgeLocations.map((location) => (
                <li key={location}>{location}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="font-medium">Recipe places</p>
          {glance.recipePlaceNames.length === 0 ? (
            <p className="text-muted-foreground">No recipe places yet.</p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {glance.recipePlaceNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </div>
        {glance.constraints.length > 0 ? (
          <div>
            <p className="font-medium">Constraints</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {glance.constraints.map((constraint) => (
                <li key={constraint}>{constraint}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/settings">Edit household settings</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
