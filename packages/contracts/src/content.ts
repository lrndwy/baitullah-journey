import { z } from 'zod'
import { PaginationQuerySchema, UuidSchema, type Page } from './pagination'

export const ArticleStatusSchema = z.enum(['draft', 'published', 'archived'])
export type ArticleStatus = z.infer<typeof ArticleStatusSchema>

export const ArticleSchema = z.object({
  id: UuidSchema,
  authorId: UuidSchema.nullable(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  status: ArticleStatusSchema,
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Article = z.infer<typeof ArticleSchema>

export const CreateArticleSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  excerpt: z.string().trim().max(2000).nullable().optional(),
  content: z.string().trim().max(200_000).nullable().optional(),
  thumbnailUrl: z.string().trim().max(2000).nullable().optional(),
  status: ArticleStatusSchema.default('draft'),
  publishedAt: z.string().datetime().nullable().optional(),
})
export type CreateArticleInput = z.infer<typeof CreateArticleSchema>

export const UpdateArticleSchema = CreateArticleSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
)
export type UpdateArticleInput = z.infer<typeof UpdateArticleSchema>

export const GalleryImageSchema = z.object({
  id: UuidSchema,
  galleryId: UuidSchema,
  imageUrl: z.string(),
  caption: z.string().nullable(),
  sortOrder: z.number().int(),
})
export type GalleryImage = z.infer<typeof GalleryImageSchema>

export const GallerySchema = z.object({
  id: UuidSchema,
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  eventDate: z.string().nullable(),
  isPublished: z.boolean(),
  createdBy: UuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  images: z.array(GalleryImageSchema).optional(),
})
export type Gallery = z.infer<typeof GallerySchema>

export const CreateGallerySchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  description: z.string().trim().max(5000).nullable().optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  isPublished: z.boolean().default(false),
})
export type CreateGalleryInput = z.infer<typeof CreateGallerySchema>

export const UpdateGallerySchema = CreateGallerySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
)
export type UpdateGalleryInput = z.infer<typeof UpdateGallerySchema>

export const CreateGalleryImageSchema = z.object({
  imageUrl: z.string().trim().min(1).max(2000),
  caption: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
})
export type CreateGalleryImageInput = z.infer<typeof CreateGalleryImageSchema>

export const UpdateGalleryImageSchema = CreateGalleryImageSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
)
export type UpdateGalleryImageInput = z.infer<typeof UpdateGalleryImageSchema>

/** Confirms a gallery image upload and creates the gallery_images row. */
export const CompleteGalleryImageUploadSchema = z.object({
  key: z.string().trim().min(1).max(512),
  caption: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
})
export type CompleteGalleryImageUploadInput = z.infer<typeof CompleteGalleryImageUploadSchema>

export const TestimonialSchema = z.object({
  id: UuidSchema,
  customerName: z.string(),
  content: z.string(),
  rating: z.number().int(),
  photoUrl: z.string().nullable(),
  isPublished: z.boolean(),
  createdBy: UuidSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Testimonial = z.infer<typeof TestimonialSchema>

export const CreateTestimonialSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
  rating: z.number().int().min(1).max(5),
  photoUrl: z.string().trim().max(2000).nullable().optional(),
  isPublished: z.boolean().default(false),
})
export type CreateTestimonialInput = z.infer<typeof CreateTestimonialSchema>

export const UpdateTestimonialSchema = CreateTestimonialSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
)
export type UpdateTestimonialInput = z.infer<typeof UpdateTestimonialSchema>

export const ListArticlesQuerySchema = PaginationQuerySchema.extend({
  status: ArticleStatusSchema.optional(),
  q: z.string().trim().max(120).optional(),
})
export type ListArticlesQuery = z.infer<typeof ListArticlesQuerySchema>

export const ListGalleriesQuerySchema = PaginationQuerySchema.extend({
  published: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
})
export type ListGalleriesQuery = z.infer<typeof ListGalleriesQuerySchema>

export const ListTestimonialsQuerySchema = PaginationQuerySchema.extend({
  published: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
})
export type ListTestimonialsQuery = z.infer<typeof ListTestimonialsQuerySchema>

export type ArticleListResponse = Page<Article>
export type GalleryListResponse = Page<Gallery>
export type TestimonialListResponse = Page<Testimonial>

export const ContentIdParamSchema = z.object({ id: UuidSchema })
export const ContentSlugParamSchema = z.object({ slug: z.string().min(1).max(200) })
