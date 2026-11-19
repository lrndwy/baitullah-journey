import type { AuthPrincipal } from '@app/core'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by `AuthGuard` for every non-public route. */
      principal?: AuthPrincipal
      /** Correlation id, echoed back in the `x-request-id` response header. */
      requestId: string
      /** High-resolution start time, used for access logging. */
      startedAt: number
    }
  }
}

export {}