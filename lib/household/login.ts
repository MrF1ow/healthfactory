export type LoginIdentifier =
  | { kind: "email"; email: string }
  | { kind: "username"; username: string }

export function authEmailForLogin(login: LoginIdentifier): string {
  if (login.kind === "email") {
    return login.email
  }
  return `${login.username}@household.invalid`
}
