import { z } from 'zod'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH_FLOOR } from './password'

export const RefreshRequestSchema = z.object({
  /** Omitted by browsers, which send the httpOnly cookie instead. */
  refreshToken: z.string().min(1).optional(),
})

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>

/**
 * A six-digit code rather than a magic link: it survives being read on a
 * different device, and it cannot be consumed by a link prefetcher.
 */
export const PasswordResetCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the six-digit code from the email')

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
})

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>

export const PasswordLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(200),
})

export type PasswordLoginInput = z.infer<typeof PasswordLoginSchema>

export const ResetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  code: PasswordResetCodeSchema,
  /**
   * Structural floor only. The configured policy (see `./password`) is applied
   * server-side against the real minimum, because that minimum is a deployment
   * setting and a hard-coded schema would silently contradict it.
   */
  newPassword: z.string().min(PASSWORD_MIN_LENGTH_FLOOR).max(PASSWORD_MAX_LENGTH),
})

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH_FLOOR).max(PASSWORD_MAX_LENGTH),
})

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>

/** Deliberately identical whether or not the address exists. */
export interface ForgotPasswordResponse {
  ok: true
  message: string
  /** Present only when mail is not configured, so local dev can proceed. */
  devCode?: string
}

export interface SessionUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  roles: string[]
  permissions: string[]
}

export interface TokenResponse {
  accessToken: string
  /** ISO-8601. The client refreshes shortly before this instant. */
  expiresAt: string
  user: SessionUser
}

export interface ModuleMeta {
  name: string
  title: string
  description?: string
  version?: string
  core: boolean
}

export interface ModulesResponse {
  modules: ModuleMeta[]
}

export interface NavigationItem {
  label: string
  path: string
  icon?: string
  permission?: string
  module: string
}

export interface NavigationResponse {
  items: NavigationItem[]
}

export interface PermissionMeta {
  key: string
  description: string
  /** Owning module, so a permission picker can group by feature area. */
  module: string
}

export interface PermissionsResponse {
  permissions: PermissionMeta[]
}