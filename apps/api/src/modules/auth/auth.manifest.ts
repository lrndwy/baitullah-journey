import { oauthAccounts, users, type ModuleManifest } from '@app/core'

export const authManifest: ModuleManifest = {
  name: 'auth',
  title: 'Authentication',
  description: 'Google sign-in, password reset, sessions and token issuance.',
  version: '1.1.0',
  core: true,
  permissions: [
    { key: 'auth.session.read', description: 'View your own active sessions' },
    { key: 'auth.session.revoke', description: 'Revoke your own sessions' },
    { key: 'auth.password.reset_request', description: "Trigger a password reset for another user" },
  ],
  emits: ['auth.login', 'auth.logout', 'auth.password.changed', 'auth.password.reset'],
  /**
   * `sessions` and `password_reset_codes` are deliberately absent: live
   * credentials must never travel inside a backup archive.
   */
  tables: [users, oauthAccounts],
}