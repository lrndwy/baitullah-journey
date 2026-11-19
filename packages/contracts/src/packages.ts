import { z } from 'zod'
import { PaginationQuerySchema, UuidSchema, type Page } from './pagination'

export const PackageStatusSchema = z.enum(['draft', 'published', 'archived'])
export type PackageStatus = z.infer<typeof PackageStatusSchema>

export const DepartureStatusSchema = z.enum(['open', 'full', 'closed', 'cancelled'])
export type DepartureStatus = z.infer<typeof DepartureStatusSchema>

export const CategorySchema = z.object({
  id: UuidSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Category = z.infer<typeof CategorySchema>

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  description: z.string().trim().max(2000).nullable().optional(),
})
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>

export const UpdateCategorySchema = CreateCategorySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
)
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>

export const PackageSchema = z.object({
  id: UuidSchema,
  categoryId: UuidSchema,
  categoryName: z.string().optional(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  packageType: z.string().nullable(),
  status: PackageStatusSchema,
  isFeatured: z.boolean(),
  basePrice: z.number().int().nonnegative(),
  currency: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Package = z.infer<typeof PackageSchema>

export const CreatePackageSchema = z.object({
  categoryId: UuidSchema,
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  description: z.string().trim().max(20_000).nullable().optional(),
  thumbnailUrl: z.string().trim().max(2000).nullable().optional(),
  packageType: z.string().trim().max(80).nullable().optional(),
  status: PackageStatusSchema.default('draft'),
  isFeatured: z.boolean().default(false),
  basePrice: z.number().int().nonnegative(),
  currency: z.string().trim().min(1).max(8).default('IDR'),
  facilityIds: z.array(UuidSchema).max(100).optional(),
  accommodations: z
    .array(
      z.object({
        accommodationId: UuidSchema,
        accommodationRole: z.string().trim().min(1).max(80),
        nights: z.number().int().min(0).max(365),
      }),
    )
    .max(50)
    .optional(),
})
export type CreatePackageInput = z.infer<typeof CreatePackageSchema>

export const UpdatePackageSchema = CreatePackageSchema.partial()
  .omit({ facilityIds: true, accommodations: true })
  .extend({
    facilityIds: z.array(UuidSchema).max(100).optional(),
    accommodations: z
      .array(
        z.object({
          accommodationId: UuidSchema,
          accommodationRole: z.string().trim().min(1).max(80),
          nights: z.number().int().min(0).max(365),
        }),
      )
      .max(50)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })
export type UpdatePackageInput = z.infer<typeof UpdatePackageSchema>

export const DepartureSchema = z.object({
  id: UuidSchema,
  packageId: UuidSchema,
  departureDate: z.string(),
  returnDate: z.string(),
  quota: z.number().int(),
  availableQuota: z.number().int(),
  airline: z.string().nullable(),
  status: DepartureStatusSchema,
  priceOverride: z.number().int().nonnegative().nullable(),
  effectivePrice: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Departure = z.infer<typeof DepartureSchema>

export const CreateDepartureSchema = z
  .object({
    packageId: UuidSchema,
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    quota: z.number().int().positive().max(10_000),
    availableQuota: z.number().int().min(0).max(10_000).optional(),
    airline: z.string().trim().max(120).nullable().optional(),
    status: DepartureStatusSchema.default('open'),
    priceOverride: z.number().int().nonnegative().nullable().optional(),
  })
  .refine((value) => value.returnDate >= value.departureDate, {
    message: 'returnDate must be on or after departureDate',
    path: ['returnDate'],
  })
export type CreateDepartureInput = z.infer<typeof CreateDepartureSchema>

export const UpdateDepartureSchema = z
  .object({
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    quota: z.number().int().positive().max(10_000).optional(),
    availableQuota: z.number().int().min(0).max(10_000).optional(),
    airline: z.string().trim().max(120).nullable().optional(),
    status: DepartureStatusSchema.optional(),
    priceOverride: z.number().int().nonnegative().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })
export type UpdateDepartureInput = z.infer<typeof UpdateDepartureSchema>

export const ItinerarySchema = z.object({
  id: UuidSchema,
  departureId: UuidSchema,
  dayNumber: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
})
export type Itinerary = z.infer<typeof ItinerarySchema>

export const CreateItinerarySchema = z.object({
  departureId: UuidSchema,
  dayNumber: z.number().int().positive().max(365),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10_000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
})
export type CreateItineraryInput = z.infer<typeof CreateItinerarySchema>

export const UpdateItinerarySchema = CreateItinerarySchema.omit({ departureId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })
export type UpdateItineraryInput = z.infer<typeof UpdateItinerarySchema>

export const FacilitySchema = z.object({
  id: UuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
})
export type Facility = z.infer<typeof FacilitySchema>

export const CreateFacilitySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
})
export type CreateFacilityInput = z.infer<typeof CreateFacilitySchema>

export const UpdateFacilitySchema = CreateFacilitySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
)
export type UpdateFacilityInput = z.infer<typeof UpdateFacilitySchema>

export const AccommodationSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  accommodationType: z.string().nullable(),
  address: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  createdAt: z.string(),
})
export type Accommodation = z.infer<typeof AccommodationSchema>

export const CreateAccommodationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  city: z.string().trim().max(120).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
  accommodationType: z.string().trim().max(80).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  websiteUrl: z.string().trim().max(500).nullable().optional(),
})
export type CreateAccommodationInput = z.infer<typeof CreateAccommodationSchema>

export const UpdateAccommodationSchema = CreateAccommodationSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
)
export type UpdateAccommodationInput = z.infer<typeof UpdateAccommodationSchema>

export const PackageFacilityLinkSchema = z.object({
  facilityId: UuidSchema,
  name: z.string(),
  description: z.string().nullable(),
})
export type PackageFacilityLink = z.infer<typeof PackageFacilityLinkSchema>

export const PackageAccommodationLinkSchema = z.object({
  accommodationId: UuidSchema,
  name: z.string(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  accommodationRole: z.string(),
  nights: z.number().int(),
})
export type PackageAccommodationLink = z.infer<typeof PackageAccommodationLinkSchema>

export const PackageDetailSchema = PackageSchema.extend({
  facilities: z.array(PackageFacilityLinkSchema),
  accommodations: z.array(PackageAccommodationLinkSchema),
  departures: z.array(DepartureSchema),
})
export type PackageDetail = z.infer<typeof PackageDetailSchema>

export const ListPackagesQuerySchema = PaginationQuerySchema.extend({
  categorySlug: z.string().optional(),
  status: PackageStatusSchema.optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  q: z.string().trim().max(120).optional(),
})
export type ListPackagesQuery = z.infer<typeof ListPackagesQuerySchema>

export type CategoryListResponse = Page<Category>
export type PackageListResponse = Page<Package>
export type DepartureListResponse = Page<Departure>
export type FacilityListResponse = Page<Facility>
export type AccommodationListResponse = Page<Accommodation>

export const IdParamSchema = z.object({ id: UuidSchema })
export const SlugParamSchema = z.object({ slug: z.string().min(1).max(200) })
