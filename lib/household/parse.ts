export type BootstrapInput = {
  householdName: string
  personName: string
  email: string
  password: string
}

export type SignInInput = {
  email: string
  password: string
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

function readString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
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
  const email = normalizeEmail(readString(formData, "email"))
  const password = readString(formData, "password")
  const emailError = validateEmail(email)
  if (emailError) {
    return { ok: false, error: emailError }
  }
  if (!password) {
    return { ok: false, error: "Enter your password." }
  }
  return { ok: true, value: { email, password } }
}
