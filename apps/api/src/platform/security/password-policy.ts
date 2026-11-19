import { BadRequestError, type Env } from '@app/core'
import {
  checkPassword,
  passwordPolicyRules,
  resolvePasswordPolicy,
  type PasswordContext,
  type PasswordPolicy,
} from '@app/contracts'

/**
 * The kernel's view of the password policy.
 *
 * The rules themselves live in `@app/contracts` so the browser can state them
 * before a form is submitted. This file is the enforcement side: it turns the
 * deployment's settings into a policy object and refuses anything that breaks
 * it, in the one place every password write goes through.
 *
 * Why the application and not the database: this deployment authenticates
 * application users with scrypt hashes it owns, so the only password a
 * `CREATE ROLE` policy would protect is the migration user's. The database-side
 * equivalents (`passwordcheck`, `VALID UNTIL`, `scram-sha-256`) are applied in
 * `docker/postgres/password-policy.sql`; see `docs/PASSWORD-POLICY.md`.
 */

export function activePasswordPolicy(env: Env): PasswordPolicy {
  return resolvePasswordPolicy({
    level: env.PASSWORD_POLICY,
    minLength: env.PASSWORD_MIN_LENGTH,
  })
}

/** What the web client renders as the checklist under a password field. */
export function activePasswordPolicySummary(env: Env): {
  level: PasswordPolicy['level']
  minLength: number
  rules: { code: string; label: string }[]
} {
  const policy = activePasswordPolicy(env)
  return {
    level: policy.level,
    minLength: policy.minLength,
    rules: passwordPolicyRules(policy),
  }
}

/**
 * Throws the request away with every rule the password broke, not just the
 * first: the client shows them as a checklist in one pass.
 */
export function assertPasswordPolicy(
  env: Env,
  password: string,
  context?: PasswordContext,
): void {
  const policy = activePasswordPolicy(env)
  const violations = checkPassword(password, policy, context)
  if (violations.length === 0) return

  throw new BadRequestError(violations[0]?.message ?? 'The password does not meet the policy', {
    violations,
    policy: activePasswordPolicySummary(env),
  })
}