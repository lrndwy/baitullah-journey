import { z } from 'zod'
import { PaginationQuerySchema } from './pagination'

/** Stable keys are referenced from code, so they are constrained at the edge. */
export const RoleKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z][a-z0-9_.-]*$/, 'Use lowercase letters, digits, dot, dash or underscore')

export const CreateRoleSchema = z.object({
  key: RoleKeySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(z.string().min(1).max(120)).max(500).default([]),
})

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>

export const UpdateRoleSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    permissions: z.array(z.string().min(1).max(120)).max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })

export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>

export const AssignRoleSchema = z.object({
  /** `true` grants the role, `false` revokes it. */
  assigned: z.boolean(),
})

export type AssignRoleInput = z.infer<typeof AssignRoleSchema>

export const ListRolesQuerySchema = PaginationQuerySchema

export interface Role {
  id: string
  key: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: string[]
  /** Number of users currently holding this role. */
  memberCount: number
  createdAt: string
}

export type RoleListResponse = {
  items: Role[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

export interface Permission {
  key: string
  description: string
  module: string
}