import {
  isRecipePlaceType,
  type HouseholdConfig,
  type RecipeSearchPlace,
} from "@/lib/household/config"
import type { LoginIdentifier } from "@/lib/household/login"
import type { HumanMealDraft } from "@/lib/household/meal"
import {
  isActivityLevel,
  isCheckInCadence,
  isSex,
  parseMacroAmountsFromOptionals,
  parseNonNegativeNumber,
  parsePositiveNumber,
  type PersonProfileDraft,
} from "@/lib/household/profile"

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

export function parseProfileInput(formData: FormData): ParseResult<PersonProfileDraft> {
  const age = parsePositiveNumber(readString(formData, "age"), "age")
  if (!age.ok) {
    return age
  }
  if (age.value !== null && !Number.isInteger(age.value)) {
    return { ok: false, error: "Enter a whole-number age." }
  }

  const sexRaw = readString(formData, "sex").trim()
  let sex: PersonProfileDraft["sex"] = null
  if (sexRaw) {
    if (!isSex(sexRaw)) {
      return { ok: false, error: "Unknown sex." }
    }
    sex = sexRaw
  }

  const heightCm = parsePositiveNumber(readString(formData, "heightCm"), "height")
  if (!heightCm.ok) {
    return heightCm
  }
  const weightKg = parsePositiveNumber(readString(formData, "weightKg"), "weight")
  if (!weightKg.ok) {
    return weightKg
  }

  const activityRaw = readString(formData, "activityLevel").trim()
  let activityLevel: PersonProfileDraft["activityLevel"] = null
  if (activityRaw) {
    if (!isActivityLevel(activityRaw)) {
      return { ok: false, error: "Unknown activity level." }
    }
    activityLevel = activityRaw
  }

  const calories = parseNonNegativeNumber(readString(formData, "calories"), "calories")
  if (!calories.ok) {
    return calories
  }
  const proteinG = parseNonNegativeNumber(readString(formData, "proteinG"), "protein")
  if (!proteinG.ok) {
    return proteinG
  }
  const carbsG = parseNonNegativeNumber(readString(formData, "carbsG"), "carbs")
  if (!carbsG.ok) {
    return carbsG
  }
  const fatG = parseNonNegativeNumber(readString(formData, "fatG"), "fat")
  if (!fatG.ok) {
    return fatG
  }
  const amounts = parseMacroAmountsFromOptionals(
    calories.value,
    proteinG.value,
    carbsG.value,
    fatG.value,
  )
  if (!amounts.ok) {
    return amounts
  }

  const cadenceRaw = readString(formData, "checkInCadence").trim() || "off"
  if (!isCheckInCadence(cadenceRaw)) {
    return { ok: false, error: "Unknown check-in cadence." }
  }

  return {
    ok: true,
    value: {
      ageYears: age.value,
      sex,
      heightCm: heightCm.value,
      weightKg: weightKg.value,
      activityLevel,
      macroTargets: amounts.value ? { method: "manual", amounts: amounts.value } : null,
      preferences: {
        schemaVersion: 1,
        dietaryRestrictions: readLines(formData, "dietaryRestrictions"),
        allergies: readLines(formData, "allergies"),
        likes: readLines(formData, "likes"),
        dislikes: readLines(formData, "dislikes"),
        notes: optionalText(readString(formData, "notes")),
      },
      botConfig: {
        schemaVersion: 1,
        checkInCadence: cadenceRaw,
        guidance: optionalText(readString(formData, "guidance")),
      },
    },
  }
}

export function parseMealInput(formData: FormData): ParseResult<HumanMealDraft> {
  const description = readString(formData, "description").trim()
  if (!description) {
    return { ok: false, error: "Enter what you ate." }
  }

  const calories = parseNonNegativeNumber(readString(formData, "calories"), "calories")
  if (!calories.ok) {
    return calories
  }
  const proteinG = parseNonNegativeNumber(readString(formData, "proteinG"), "protein")
  if (!proteinG.ok) {
    return proteinG
  }
  const carbsG = parseNonNegativeNumber(readString(formData, "carbsG"), "carbs")
  if (!carbsG.ok) {
    return carbsG
  }
  const fatG = parseNonNegativeNumber(readString(formData, "fatG"), "fat")
  if (!fatG.ok) {
    return fatG
  }
  const amounts = parseMacroAmountsFromOptionals(
    calories.value,
    proteinG.value,
    carbsG.value,
    fatG.value,
  )
  if (!amounts.ok) {
    return amounts
  }

  return {
    ok: true,
    value: {
      payload: {
        schemaVersion: 1,
        kind: "meal",
        description,
        nutrition: amounts.value,
      },
    },
  }
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
