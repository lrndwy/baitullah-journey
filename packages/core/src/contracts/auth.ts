/** The authenticated caller, attached to every request by the auth guard. */
export interface AuthPrincipal {
  userId: string
  email: string
  sessionId: string
  roles: string[]
  /** Flattened, de-duplicated permission keys granted through those roles. */
  permissions: string[]
}
