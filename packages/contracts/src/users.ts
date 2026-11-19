import { z } from 'zod'
import { PaginationQuerySchema, UuidSchema } from './pagination'

export const UserStatusSchema = z.enum(['active', 'suspended'])
export type UserStatus = z.infer<typeof UserStatusSchema>

export const UserDeletedFilterSchema = z.enum(['exclude', 'include', 'only']).default('exclude')
export type UserDeletedFilter = z.infer<typeof UserDeletedFilterSchema>

export const ListUsersQuerySchema = PaginationQuerySchema.extend({
  /** Case-insensitive match against email and name. */
  search: z.string().trim().min(1).max(200).optional(),
  status: UserStatusSchema.optional(),
  /**
   * `exclude` (default) — active accounts only.
   * `only` — soft-deleted accounts.
   * `include` — both.
   */
  deleted: UserDeletedFilterSchema,
})

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>

export const CreateUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  name: z.string().trim().min(1).max(200).optional(),
  /** Optional: accounts created with a password or invited via OAuth. */
  password: z.string().min(12).max(200).optional(),
  roleKeys: z.array(z.string().min(1).max(64)).max(20).default([]),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>

export const UpdateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(200).nullable().optional(),
    status: UserStatusSchema.optional(),
    roleKeys: z.array(z.string().min(1).max(64)).max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

export const UserIdParamSchema = z.object({ id: UuidSchema })

export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  status: UserStatus
  roles: string[]
  createdAt: string
  /** ISO timestamp when soft-deleted; null while the account is active. */
  deletedAt: string | null
}

export type UserListResponse = {
  items: User[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}