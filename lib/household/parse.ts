import {
  isRecipePlaceType,
  type HouseholdConfig,
  type RecipeSearchPlace,
} from "@/lib/household/config"
import type { LoginIdentifier } from "@/lib/household/login"

export type BootstrapInput = {
  householdName: string
  personName: string
  email: string
  password: string
}

export type SignInInput = {
  login: LoginIdentifier
  password: string
}

export type MemberDraft = {
  name: string
  login: LoginIdentifier
  password: string
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}$/

function readString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function readLines(formData: FormData, key: string): string[] {
  return readString(formData, key)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function validateEmail(email: string): string | null {
  if (!email.includes("@") || email.length < 3) {
    return "Enter a valid email address."
  }
  return null
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters."
  }
  return null
}

function optionalText(raw: string): string | null {
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

function parseLoginIdentifier(raw: string): ParseResult<LoginIdentifier> {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, error: "Enter an email or username." }
  }
  if (trimmed.includes("@")) {
    const email = normalizeEmail(trimmed)
    const emailError = validateEmail(email)
    if (emailError) {
      return { ok: false, error: emailError }
    }
    return { ok: true, value: { kind: "email", email } }
  }
  const username = trimmed.toLowerCase()
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "Enter a valid username." }
  }
  return { ok: true, value: { kind: "username", username } }
}

export function parseOwnerNames(
  formData: FormData,
): ParseResult<{ householdName: string; personName: string }> {
  const householdName = readString(formData, "householdName").trim()
  const personName = readString(formData, "personName").trim()
  if (!householdName) {
    return { ok: false, error: "Enter a household name." }
  }
  if (!personName) {
    return { ok: false, error: "Enter your name." }
  }
  return { ok: true, value: { householdName, personName } }
}

export function parseBootstrapInput(formData: FormData): ParseResult<BootstrapInput> {
  const names = parseOwnerNames(formData)
  if (!names.ok) {
    return names
  }
  const email = normalizeEmail(readString(formData, "email"))
  const password = readString(formData, "password")
  const emailError = validateEmail(email)
  if (emailError) {
    return { ok: false, error: emailError }
  }
  const passwordError = validatePassword(password)
  if (passwordError) {
    return { ok: false, error: passwordError }
  }

  return {
    ok: true,
    value: {
      householdName: names.value.householdName,
      personName: names.value.personName,
      email,
      password,
    },
  }
}

export function parseSignInInput(formData: FormData): ParseResult<SignInInput> {
  const login = parseLoginIdentifier(readString(formData, "identifier"))
  if (!login.ok) {
    return login
  }
  const password = readString(formData, "password")
  if (!password) {
    return { ok: false, error: "Enter your password." }
  }
  return { ok: true, value: { login: login.value, password } }
}

export function parseMemberInput(formData: FormData): ParseResult<MemberDraft> {
  const name = readString(formData, "name").trim()
  if (!name) {
    return { ok: false, error: "Enter a name." }
  }

  const email = readString(formData, "email").trim()
  const username = readString(formData, "username").trim()
  if (!email && !username) {
    return { ok: false, error: "Enter an email or username." }
  }

  const password = readString(formData, "password")
  const passwordError = validatePassword(password)
  if (passwordError) {
    return { ok: false, error: passwordError }
  }

  const login = parseLoginIdentifier(email || username)
  if (!login.ok) {
    return login
  }

  return {
    ok: true,
    value: {
      name,
      login: login.value,
      password,
    },
  }
}

function parseRecipeSearchPlaces(raw: string): ParseResult<RecipeSearchPlace[]> {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  const places: RecipeSearchPlace[] = []
  for (const line of lines) {
    const parts = line.split("|").map((part) => part.trim())
    const name = parts[0] ?? ""
    const type = parts[1] ?? ""
    const urlRaw = parts[2] ?? ""
    if (!name || !type) {
      return { ok: false, error: "Enter recipe places as Name | type | url." }
    }
    if (!isRecipePlaceType(type)) {
      return { ok: false, error: "Unknown recipe place type." }
    }
    places.push({
      name,
      type,
      url: urlRaw ? urlRaw : null,
    })
  }
  return { ok: true, value: places }
}

export function parseHouseholdConfig(formData: FormData): ParseResult<HouseholdConfig> {
  const name = readString(formData, "name").trim()
  if (!name) {
    return { ok: false, error: "Enter a household name." }
  }

  const places = parseRecipeSearchPlaces(readString(formData, "recipeSearchPlaces"))
  if (!places.ok) {
    return places
  }

  return {
    ok: true,
    value: {
      name,
      fridgeLocations: readLines(formData, "fridgeLocations"),
      recipeSearchPlaces: places.value,
      preferences: {
        constraints: readLines(formData, "constraints"),
        budget: optionalText(readString(formData, "budget")),
        shoppingCadence: optionalText(readString(formData, "shoppingCadence")),
      },
    },
  }
}
