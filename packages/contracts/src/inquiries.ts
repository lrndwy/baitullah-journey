import { z } from 'zod'
import { PaginationQuerySchema, UuidSchema, type Page } from './pagination'

export const InquiryStatusSchema = z.enum([
  'baru',
  'dihubungi',
  'dikonfirmasi',
  'selesai',
  'ditolak',
])
export type InquiryStatus = z.infer<typeof InquiryStatusSchema>

export const PreferredContactSchema = z.enum(['email', 'whatsapp'])
export type PreferredContact = z.infer<typeof PreferredContactSchema>

/** Allowed admin status transitions — matches the approved design. */
export const INQUIRY_TRANSITIONS: Record<InquiryStatus, readonly InquiryStatus[]> = {
  baru: ['dihubungi', 'ditolak'],
  dihubungi: ['dikonfirmasi', 'ditolak'],
  dikonfirmasi: ['selesai', 'ditolak'],
  selesai: [],
  ditolak: [],
}

export const InquirySchema = z.object({
  id: UuidSchema,
  packageId: UuidSchema,
  departureId: UuidSchema,
  packageName: z.string().optional(),
  departureDate: z.string().optional(),
  customerName: z.string(),
  email: z.string(),
  phone: z.string(),
  paxCount: z.number().int(),
  notes: z.string().nullable(),
  preferredContact: PreferredContactSchema,
  status: InquiryStatusSchema,
  adminNotes: z.string().nullable(),
  quotaApplied: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Inquiry = z.infer<typeof InquirySchema>

export const CreateInquirySchema = z.object({
  packageId: UuidSchema,
  departureId: UuidSchema,
  customerName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(6).max(32),
  paxCount: z.number().int().positive().max(50),
  notes: z.string().trim().max(5000).nullable().optional(),
  preferredContact: PreferredContactSchema.default('whatsapp'),
})
export type CreateInquiryInput = z.infer<typeof CreateInquirySchema>

export const UpdateInquiryStatusSchema = z.object({
  status: InquiryStatusSchema,
  adminNotes: z.string().trim().max(5000).nullable().optional(),
})
export type UpdateInquiryStatusInput = z.infer<typeof UpdateInquiryStatusSchema>

export const ListInquiriesQuerySchema = PaginationQuerySchema.extend({
  status: InquiryStatusSchema.optional(),
  packageId: UuidSchema.optional(),
  q: z.string().trim().max(120).optional(),
})
export type ListInquiriesQuery = z.infer<typeof ListInquiriesQuerySchema>

export type InquiryListResponse = Page<Inquiry>

export const InquiryIdParamSchema = z.object({ id: UuidSchema })
