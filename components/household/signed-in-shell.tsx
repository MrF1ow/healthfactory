import type { ReactNode } from "react"
import Link from "next/link"
import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import type { SignedInPerson } from "@/lib/household/screen"

export type SignedInPage = "home" | "profile" | "settings"

const PAGE_LABELS: Record<SignedInPage, string> = {
  home: "Home",
  profile: "My profile",
  settings: "Settings",
}

const PAGE_HREFS: Record<SignedInPage, string> = {
  home: "/",
  profile: "/profile",
  settings: "/settings",
}

export function SignedInShell({
  current,
  person,
  children,
}: {
  current: SignedInPage
  person: SignedInPerson
  children: ReactNode
}) {
  const pages: SignedInPage[] = ["home", "profile", "settings"]

  return (
    <main className="flex min-h-full flex-1 flex-col items-center bg-background px-4 py-16">
      <div className="mb-8 w-full max-w-2xl">
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {pages.map((page, index) => (
            <span key={page} className="flex items-center gap-3">
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              {page === current ? (
                <span aria-current="page">{PAGE_LABELS[page]}</span>
              ) : (
                <Link
                  href={PAGE_HREFS[page]}
                  className="underline-offset-4 hover:underline"
                >
                  {PAGE_LABELS[page]}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <h1 className="mt-4 font-heading text-2xl font-medium tracking-tight">
          {PAGE_LABELS[current]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {person.name} ({person.role}).
        </p>
        <form action={signOut} className="mt-4">
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
      {children}
    </main>
  )
}
