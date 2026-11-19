import { Inject, Injectable } from '@nestjs/common'
import {
  ConflictError,
  NotFoundError,
  buildPage,
  decodeCursor,
  keysetCondition,
  normalizeLimit,
  type DatabaseHandle,
  type EventBus,
} from '@app/core'
import type {
  Accommodation,
  AccommodationListResponse,
  Category,
  CategoryListResponse,
  CreateAccommodationInput,
  CreateCategoryInput,
  CreateDepartureInput,
  CreateFacilityInput,
  CreateItineraryInput,
  CreatePackageInput,
  Departure,
  DepartureListResponse,
  Facility,
  FacilityListResponse,
  Itinerary,
  ListPackagesQuery,
  Package,
  PackageAccommodationLink,
  PackageDetail,
  PackageFacilityLink,
  PackageListResponse,
  PackageStatus,
  PaginationQuery,
  UpdateAccommodationInput,
  UpdateCategoryInput,
  UpdateDepartureInput,
  UpdateFacilityInput,
  UpdateItineraryInput,
  UpdatePackageInput,
} from '@app/contracts'
import { and, asc, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm'
import { DATABASE, EVENT_BUS } from '../../platform/tokens'
import {
  accommodations,
  categories,
  departures,
  facilities,
  itineraries,
  packageAccommodations,
  packageFacilities,
  packages,
} from './packages.schema'
import { effectivePrice, isPublicDeparture, isPublicPackage } from './public-filter'

export type ListDeparturesQuery = PaginationQuery & { packageId?: string }

export type PublicPackageDetail = Omit<PackageDetail, 'departures'> & {
  departures: Array<Departure & { itineraries: Itinerary[] }>
}

type PackageRow = typeof packages.$inferSelect
type CategoryRow = typeof categories.$inferSelect
type DepartureRow = typeof departures.$inferSelect
type FacilityRow = typeof facilities.$inferSelect
type AccommodationRow = typeof accommodations.$inferSelect
type ItineraryRow = typeof itineraries.$inferSelect

@Injectable()
export class PackagesService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(EVENT_BUS) private readonly events: EventBus,
  ) {}

  // ── Categories ──────────────────────────────────────────────────────────

  async listCategories(query: PaginationQuery): Promise<CategoryListResponse> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined
    const filters: SQL[] = []
    if (position) {
      const keyset = keysetCondition(categories.createdAt, categories.id, position)
      if (keyset) filters.push(keyset)
    }
    const where = filters.length > 0 ? and(...filters) : undefined

    const [countRows, rows] = await Promise.all([
      this.database.db.select({ total: sql<number>`count(*)::int` }).from(categories),
      this.database.db
        .select()
        .from(categories)
        .where(where)
        .orderBy(desc(categories.createdAt), desc(categories.id))
        .limit(pageSize + 1),
    ])

    const page = buildPage(rows, pageSize, countRows[0]?.total ?? 0)
    return { ...page, items: page.items.map(toCategory) }
  }

  async listPublicCategories(): Promise<{ items: Category[] }> {
    const rows = await this.database.db
      .select()
      .from(categories)
      .orderBy(asc(categories.name))
    return { items: rows.map(toCategory) }
  }

  async findCategory(id: string): Promise<Category> {
    const [row] = await this.database.db.select().from(categories).where(eq(categories.id, id)).limit(1)
    if (!row) throw new NotFoundError('Category not found')
    return toCategory(row)
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    await this.assertCategorySlugFree(input.slug)
    const [row] = await this.database.db
      .insert(categories)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
      })
      .returning()
    if (!row) throw new Error('Failed to create category')
    await this.events.emit('packages.category.created', { categoryId: row.id })
    return toCategory(row)
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    await this.findCategory(id)
    if (input.slug) await this.assertCategorySlugFree(input.slug, id)
    const [row] = await this.database.db
      .update(categories)
      .set({
        name: input.name,
        slug: input.slug,
        description: input.description === undefined ? undefined : input.description,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning()
    if (!row) throw new NotFoundError('Category not found')
    await this.events.emit('packages.category.updated', { categoryId: id })
    return toCategory(row)
  }

  async removeCategory(id: string): Promise<void> {
    await this.findCategory(id)
    const [linked] = await this.database.db
      .select({ id: packages.id })
      .from(packages)
      .where(eq(packages.categoryId, id))
      .limit(1)
    if (linked) throw new ConflictError('Category still has packages')
    await this.database.db.delete(categories).where(eq(categories.id, id))
    await this.events.emit('packages.category.deleted', { categoryId: id })
  }

  // ── Packages ────────────────────────────────────────────────────────────

  async listPackages(query: ListPackagesQuery, opts?: { publicOnly?: boolean }): Promise<PackageListResponse> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined

    const base: SQL[] = []
    if (opts?.publicOnly) {
      base.push(eq(packages.status, 'published'))
    } else if (query.status) {
      base.push(eq(packages.status, query.status))
    }
    if (query.featured !== undefined) base.push(eq(packages.isFeatured, query.featured))
    if (query.q) base.push(ilike(packages.name, `%${query.q}%`))
    if (query.categorySlug) {
      base.push(eq(categories.slug, query.categorySlug))
    }

    const filters: SQL[] = [...base]
    if (position) {
      const keyset = keysetCondition(packages.createdAt, packages.id, position)
      if (keyset) filters.push(keyset)
    }

    const baseWhere = base.length > 0 ? and(...base) : undefined
    const pageWhere = filters.length > 0 ? and(...filters) : undefined

    const [countRows, rows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(packages)
        .innerJoin(categories, eq(categories.id, packages.categoryId))
        .where(baseWhere),
      this.database.db
        .select({
          package: packages,
          categoryName: categories.name,
        })
        .from(packages)
        .innerJoin(categories, eq(categories.id, packages.categoryId))
        .where(pageWhere)
        .orderBy(desc(packages.createdAt), desc(packages.id))
        .limit(pageSize + 1),
    ])

    const page = buildPage(
      rows.map((row) => ({
        ...row.package,
        createdAt: row.package.createdAt,
        id: row.package.id,
      })),
      pageSize,
      countRows[0]?.total ?? 0,
    )

    return {
      ...page,
      items: page.items.map((row) => {
        const match = rows.find((entry) => entry.package.id === row.id)
        return toPackage(row, match?.categoryName)
      }),
    }
  }

  async findPackage(id: string): Promise<PackageDetail> {
    const [row] = await this.database.db
      .select({ package: packages, categoryName: categories.name })
      .from(packages)
      .innerJoin(categories, eq(categories.id, packages.categoryId))
      .where(eq(packages.id, id))
      .limit(1)
    if (!row) throw new NotFoundError('Package not found')
    return this.toPackageDetail(row.package, row.categoryName)
  }

  async findPublicPackageBySlug(slug: string): Promise<PublicPackageDetail> {
    const [row] = await this.database.db
      .select({ package: packages, categoryName: categories.name })
      .from(packages)
      .innerJoin(categories, eq(categories.id, packages.categoryId))
      .where(eq(packages.slug, slug))
      .limit(1)
    if (!row || !isPublicPackage(row.package.status)) throw new NotFoundError('Package not found')

    const detail = await this.toPackageDetail(row.package, row.categoryName, {
      departureStatuses: ['open', 'full'],
    })
    const departureIds = detail.departures.map((item) => item.id)
    const itineraryRows =
      departureIds.length === 0
        ? []
        : await this.database.db
            .select()
            .from(itineraries)
            .where(inArray(itineraries.departureId, departureIds))
            .orderBy(asc(itineraries.dayNumber))

    const byDeparture = new Map<string, Itinerary[]>()
    for (const item of itineraryRows) {
      const list = byDeparture.get(item.departureId) ?? []
      list.push(toItinerary(item))
      byDeparture.set(item.departureId, list)
    }

    return {
      ...detail,
      departures: detail.departures.map((departure) => ({
        ...departure,
        itineraries: byDeparture.get(departure.id) ?? [],
      })),
    }
  }

  async createPackage(input: CreatePackageInput, createdBy?: string): Promise<PackageDetail> {
    await this.findCategory(input.categoryId)
    await this.assertPackageSlugFree(input.slug)

    const created = await this.database.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(packages)
        .values({
          categoryId: input.categoryId,
          createdBy: createdBy ?? null,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          thumbnailUrl: input.thumbnailUrl ?? null,
          packageType: input.packageType ?? null,
          status: input.status ?? 'draft',
          isFeatured: input.isFeatured ?? false,
          basePrice: input.basePrice,
          currency: input.currency ?? 'IDR',
        })
        .returning()
      if (!row) throw new Error('Failed to create package')

      await this.replacePackageLinks(tx, row.id, input.facilityIds, input.accommodations)
      return row
    })

    await this.events.emit('packages.created', { packageId: created.id })
    return this.findPackage(created.id)
  }

  async updatePackage(id: string, input: UpdatePackageInput): Promise<PackageDetail> {
    const existing = await this.findPackage(id)
    if (input.categoryId) await this.findCategory(input.categoryId)
    if (input.slug) await this.assertPackageSlugFree(input.slug, id)

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(packages)
        .set({
          categoryId: input.categoryId,
          name: input.name,
          slug: input.slug,
          description: input.description === undefined ? undefined : input.description,
          thumbnailUrl: input.thumbnailUrl === undefined ? undefined : input.thumbnailUrl,
          packageType: input.packageType === undefined ? undefined : input.packageType,
          status: input.status,
          isFeatured: input.isFeatured,
          basePrice: input.basePrice,
          currency: input.currency,
          updatedAt: new Date(),
        })
        .where(eq(packages.id, id))

      if (input.facilityIds !== undefined || input.accommodations !== undefined) {
        await this.replacePackageLinks(
          tx,
          id,
          input.facilityIds ?? existing.facilities.map((item) => item.facilityId),
          input.accommodations ??
            existing.accommodations.map((item) => ({
              accommodationId: item.accommodationId,
              accommodationRole: item.accommodationRole,
              nights: item.nights,
            })),
        )
      }
    })

    await this.events.emit('packages.updated', { packageId: id })
    return this.findPackage(id)
  }

  async removePackage(id: string): Promise<void> {
    await this.findPackage(id)
    await this.database.db.delete(packages).where(eq(packages.id, id))
    await this.events.emit('packages.deleted', { packageId: id })
  }

  // ── Departures ──────────────────────────────────────────────────────────

  async listDepartures(query: ListDeparturesQuery): Promise<DepartureListResponse> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined
    const base: SQL[] = []
    if (query.packageId) base.push(eq(departures.packageId, query.packageId))

    const filters: SQL[] = [...base]
    if (position) {
      const keyset = keysetCondition(departures.createdAt, departures.id, position)
      if (keyset) filters.push(keyset)
    }

    const baseWhere = base.length > 0 ? and(...base) : undefined
    const pageWhere = filters.length > 0 ? and(...filters) : undefined

    const [countRows, rows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(departures)
        .where(baseWhere),
      this.database.db
        .select({
          departure: departures,
          basePrice: packages.basePrice,
        })
        .from(departures)
        .innerJoin(packages, eq(packages.id, departures.packageId))
        .where(pageWhere)
        .orderBy(desc(departures.createdAt), desc(departures.id))
        .limit(pageSize + 1),
    ])

    const page = buildPage(
      rows.map((row) => ({ ...row.departure, createdAt: row.departure.createdAt, id: row.departure.id })),
      pageSize,
      countRows[0]?.total ?? 0,
    )

    return {
      ...page,
      items: page.items.map((row) => {
        const match = rows.find((entry) => entry.departure.id === row.id)
        return toDeparture(row, match?.basePrice ?? 0)
      }),
    }
  }

  async findDeparture(id: string): Promise<Departure> {
    const [row] = await this.database.db
      .select({ departure: departures, basePrice: packages.basePrice })
      .from(departures)
      .innerJoin(packages, eq(packages.id, departures.packageId))
      .where(eq(departures.id, id))
      .limit(1)
    if (!row) throw new NotFoundError('Departure not found')
    return toDeparture(row.departure, row.basePrice)
  }

  async createDeparture(input: CreateDepartureInput): Promise<Departure> {
    await this.findPackage(input.packageId)
    const availableQuota = input.availableQuota ?? input.quota
    if (availableQuota > input.quota) {
      throw new ConflictError('availableQuota cannot exceed quota')
    }
    const [row] = await this.database.db
      .insert(departures)
      .values({
        packageId: input.packageId,
        departureDate: input.departureDate,
        returnDate: input.returnDate,
        quota: input.quota,
        availableQuota,
        airline: input.airline ?? null,
        status: input.status ?? 'open',
        priceOverride: input.priceOverride ?? null,
      })
      .returning()
    if (!row) throw new Error('Failed to create departure')
    await this.events.emit('packages.departure.created', { departureId: row.id })
    return this.findDeparture(row.id)
  }

  async updateDeparture(id: string, input: UpdateDepartureInput): Promise<Departure> {
    const existing = await this.findDeparture(id)
    const nextQuota = input.quota ?? existing.quota
    const nextAvailable = input.availableQuota ?? existing.availableQuota
    if (nextAvailable > nextQuota) throw new ConflictError('availableQuota cannot exceed quota')

    const [row] = await this.database.db
      .update(departures)
      .set({
        departureDate: input.departureDate,
        returnDate: input.returnDate,
        quota: input.quota,
        availableQuota: input.availableQuota,
        airline: input.airline === undefined ? undefined : input.airline,
        status: input.status,
        priceOverride: input.priceOverride === undefined ? undefined : input.priceOverride,
        updatedAt: new Date(),
      })
      .where(eq(departures.id, id))
      .returning()
    if (!row) throw new NotFoundError('Departure not found')
    await this.events.emit('packages.departure.updated', { departureId: id })
    return this.findDeparture(id)
  }

  async removeDeparture(id: string): Promise<void> {
    await this.findDeparture(id)
    await this.database.db.delete(departures).where(eq(departures.id, id))
    await this.events.emit('packages.departure.deleted', { departureId: id })
  }

  // ── Itineraries ─────────────────────────────────────────────────────────

  async listItineraries(departureId: string): Promise<{ items: Itinerary[] }> {
    await this.findDeparture(departureId)
    const rows = await this.database.db
      .select()
      .from(itineraries)
      .where(eq(itineraries.departureId, departureId))
      .orderBy(asc(itineraries.dayNumber))
    return { items: rows.map(toItinerary) }
  }

  async listPublicItineraries(departureId: string): Promise<{ items: Itinerary[] }> {
    const [row] = await this.database.db
      .select({
        departure: departures,
        packageStatus: packages.status,
      })
      .from(departures)
      .innerJoin(packages, eq(packages.id, departures.packageId))
      .where(eq(departures.id, departureId))
      .limit(1)
    if (
      !row ||
      !isPublicPackage(row.packageStatus) ||
      !isPublicDeparture(row.departure.status)
    ) {
      throw new NotFoundError('Departure not found')
    }
    return this.listItineraries(departureId)
  }

  async findItinerary(id: string): Promise<Itinerary> {
    const [row] = await this.database.db.select().from(itineraries).where(eq(itineraries.id, id)).limit(1)
    if (!row) throw new NotFoundError('Itinerary not found')
    return toItinerary(row)
  }

  async createItinerary(input: CreateItineraryInput): Promise<Itinerary> {
    await this.findDeparture(input.departureId)
    try {
      const [row] = await this.database.db
        .insert(itineraries)
        .values({
          departureId: input.departureId,
          dayNumber: input.dayNumber,
          title: input.title,
          description: input.description ?? null,
          location: input.location ?? null,
        })
        .returning()
      if (!row) throw new Error('Failed to create itinerary')
      await this.events.emit('packages.itinerary.created', { itineraryId: row.id })
      return toItinerary(row)
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('Day number already exists for this departure')
      throw error
    }
  }

  async updateItinerary(id: string, input: UpdateItineraryInput): Promise<Itinerary> {
    const existing = await this.findItinerary(id)
    try {
      const [row] = await this.database.db
        .update(itineraries)
        .set({
          dayNumber: input.dayNumber,
          title: input.title,
          description: input.description === undefined ? undefined : input.description,
          location: input.location === undefined ? undefined : input.location,
        })
        .where(eq(itineraries.id, id))
        .returning()
      if (!row) throw new NotFoundError('Itinerary not found')
      await this.events.emit('packages.itinerary.updated', { itineraryId: id, departureId: existing.departureId })
      return toItinerary(row)
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('Day number already exists for this departure')
      throw error
    }
  }

  async removeItinerary(id: string): Promise<void> {
    await this.findItinerary(id)
    await this.database.db.delete(itineraries).where(eq(itineraries.id, id))
    await this.events.emit('packages.itinerary.deleted', { itineraryId: id })
  }

  // ── Facilities ──────────────────────────────────────────────────────────

  async listFacilities(query: PaginationQuery): Promise<FacilityListResponse> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined
    const filters: SQL[] = []
    if (position) {
      const keyset = keysetCondition(facilities.createdAt, facilities.id, position)
      if (keyset) filters.push(keyset)
    }
    const where = filters.length > 0 ? and(...filters) : undefined

    const [countRows, rows] = await Promise.all([
      this.database.db.select({ total: sql<number>`count(*)::int` }).from(facilities),
      this.database.db
        .select()
        .from(facilities)
        .where(where)
        .orderBy(desc(facilities.createdAt), desc(facilities.id))
        .limit(pageSize + 1),
    ])

    const page = buildPage(rows, pageSize, countRows[0]?.total ?? 0)
    return { ...page, items: page.items.map(toFacility) }
  }

  async findFacility(id: string): Promise<Facility> {
    const [row] = await this.database.db.select().from(facilities).where(eq(facilities.id, id)).limit(1)
    if (!row) throw new NotFoundError('Facility not found')
    return toFacility(row)
  }

  async createFacility(input: CreateFacilityInput): Promise<Facility> {
    try {
      const [row] = await this.database.db
        .insert(facilities)
        .values({ name: input.name, description: input.description ?? null })
        .returning()
      if (!row) throw new Error('Failed to create facility')
      await this.events.emit('packages.facility.created', { facilityId: row.id })
      return toFacility(row)
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('A facility with that name already exists')
      throw error
    }
  }

  async updateFacility(id: string, input: UpdateFacilityInput): Promise<Facility> {
    await this.findFacility(id)
    try {
      const [row] = await this.database.db
        .update(facilities)
        .set({
          name: input.name,
          description: input.description === undefined ? undefined : input.description,
        })
        .where(eq(facilities.id, id))
        .returning()
      if (!row) throw new NotFoundError('Facility not found')
      await this.events.emit('packages.facility.updated', { facilityId: id })
      return toFacility(row)
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictError('A facility with that name already exists')
      throw error
    }
  }

  async removeFacility(id: string): Promise<void> {
    await this.findFacility(id)
    await this.database.db.delete(facilities).where(eq(facilities.id, id))
    await this.events.emit('packages.facility.deleted', { facilityId: id })
  }

  // ── Accommodations ──────────────────────────────────────────────────────

  async listAccommodations(query: PaginationQuery): Promise<AccommodationListResponse> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined
    const filters: SQL[] = []
    if (position) {
      const keyset = keysetCondition(accommodations.createdAt, accommodations.id, position)
      if (keyset) filters.push(keyset)
    }
    const where = filters.length > 0 ? and(...filters) : undefined

    const [countRows, rows] = await Promise.all([
      this.database.db.select({ total: sql<number>`count(*)::int` }).from(accommodations),
      this.database.db
        .select()
        .from(accommodations)
        .where(where)
        .orderBy(desc(accommodations.createdAt), desc(accommodations.id))
        .limit(pageSize + 1),
    ])

    const page = buildPage(rows, pageSize, countRows[0]?.total ?? 0)
    return { ...page, items: page.items.map(toAccommodation) }
  }

  async findAccommodation(id: string): Promise<Accommodation> {
    const [row] = await this.database.db
      .select()
      .from(accommodations)
      .where(eq(accommodations.id, id))
      .limit(1)
    if (!row) throw new NotFoundError('Accommodation not found')
    return toAccommodation(row)
  }

  async createAccommodation(input: CreateAccommodationInput): Promise<Accommodation> {
    const [row] = await this.database.db
      .insert(accommodations)
      .values({
        name: input.name,
        city: input.city ?? null,
        country: input.country ?? null,
        accommodationType: input.accommodationType ?? null,
        address: input.address ?? null,
        websiteUrl: input.websiteUrl ?? null,
      })
      .returning()
    if (!row) throw new Error('Failed to create accommodation')
    await this.events.emit('packages.accommodation.created', { accommodationId: row.id })
    return toAccommodation(row)
  }

  async updateAccommodation(id: string, input: UpdateAccommodationInput): Promise<Accommodation> {
    await this.findAccommodation(id)
    const [row] = await this.database.db
      .update(accommodations)
      .set({
        name: input.name,
        city: input.city === undefined ? undefined : input.city,
        country: input.country === undefined ? undefined : input.country,
        accommodationType: input.accommodationType === undefined ? undefined : input.accommodationType,
        address: input.address === undefined ? undefined : input.address,
        websiteUrl: input.websiteUrl === undefined ? undefined : input.websiteUrl,
      })
      .where(eq(accommodations.id, id))
      .returning()
    if (!row) throw new NotFoundError('Accommodation not found')
    await this.events.emit('packages.accommodation.updated', { accommodationId: id })
    return toAccommodation(row)
  }

  async removeAccommodation(id: string): Promise<void> {
    await this.findAccommodation(id)
    await this.database.db.delete(accommodations).where(eq(accommodations.id, id))
    await this.events.emit('packages.accommodation.deleted', { accommodationId: id })
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private async toPackageDetail(
    row: PackageRow,
    categoryName: string,
    opts?: { departureStatuses?: string[] },
  ): Promise<PackageDetail> {
    const [facilityRows, accommodationRows, departureRows] = await Promise.all([
      this.database.db
        .select({
          facilityId: facilities.id,
          name: facilities.name,
          description: facilities.description,
        })
        .from(packageFacilities)
        .innerJoin(facilities, eq(facilities.id, packageFacilities.facilityId))
        .where(eq(packageFacilities.packageId, row.id))
        .orderBy(asc(facilities.name)),
      this.database.db
        .select({
          accommodationId: accommodations.id,
          name: accommodations.name,
          city: accommodations.city,
          country: accommodations.country,
          accommodationRole: packageAccommodations.accommodationRole,
          nights: packageAccommodations.nights,
        })
        .from(packageAccommodations)
        .innerJoin(accommodations, eq(accommodations.id, packageAccommodations.accommodationId))
        .where(eq(packageAccommodations.packageId, row.id))
        .orderBy(asc(accommodations.name)),
      this.database.db
        .select()
        .from(departures)
        .where(
          opts?.departureStatuses
            ? and(eq(departures.packageId, row.id), inArray(departures.status, opts.departureStatuses))
            : eq(departures.packageId, row.id),
        )
        .orderBy(asc(departures.departureDate)),
    ])

    return {
      ...toPackage(row, categoryName),
      facilities: facilityRows.map(
        (item): PackageFacilityLink => ({
          facilityId: item.facilityId,
          name: item.name,
          description: item.description,
        }),
      ),
      accommodations: accommodationRows.map(
        (item): PackageAccommodationLink => ({
          accommodationId: item.accommodationId,
          name: item.name,
          city: item.city,
          country: item.country,
          accommodationRole: item.accommodationRole,
          nights: item.nights,
        }),
      ),
      departures: departureRows.map((item) => toDeparture(item, row.basePrice)),
    }
  }

  private async replacePackageLinks(
    tx: Pick<DatabaseHandle['db'], 'delete' | 'insert' | 'select'>,
    packageId: string,
    facilityIds: string[] | undefined,
    accommodationLinks:
      | { accommodationId: string; accommodationRole: string; nights: number }[]
      | undefined,
  ): Promise<void> {
    if (facilityIds !== undefined) {
      if (facilityIds.length > 0) {
        const found = await tx
          .select({ id: facilities.id })
          .from(facilities)
          .where(inArray(facilities.id, facilityIds))
        const missing = facilityIds.filter((id) => !found.some((row) => row.id === id))
        if (missing.length > 0) throw new NotFoundError(`Unknown facilities: ${missing.join(', ')}`)
      }
      await tx.delete(packageFacilities).where(eq(packageFacilities.packageId, packageId))
      if (facilityIds.length > 0) {
        await tx
          .insert(packageFacilities)
          .values(facilityIds.map((facilityId) => ({ packageId, facilityId })))
      }
    }

    if (accommodationLinks !== undefined) {
      if (accommodationLinks.length > 0) {
        const ids = accommodationLinks.map((item) => item.accommodationId)
        const found = await tx
          .select({ id: accommodations.id })
          .from(accommodations)
          .where(inArray(accommodations.id, ids))
        const missing = ids.filter((id) => !found.some((row) => row.id === id))
        if (missing.length > 0) throw new NotFoundError(`Unknown accommodations: ${missing.join(', ')}`)
      }
      await tx.delete(packageAccommodations).where(eq(packageAccommodations.packageId, packageId))
      if (accommodationLinks.length > 0) {
        await tx.insert(packageAccommodations).values(
          accommodationLinks.map((item) => ({
            packageId,
            accommodationId: item.accommodationId,
            accommodationRole: item.accommodationRole,
            nights: item.nights,
          })),
        )
      }
    }
  }

  private async assertCategorySlugFree(slug: string, excludeId?: string): Promise<void> {
    const [row] = await this.database.db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1)
    if (row && row.id !== excludeId) throw new ConflictError('A category with that slug already exists')
  }

  private async assertPackageSlugFree(slug: string, excludeId?: string): Promise<void> {
    const [row] = await this.database.db
      .select({ id: packages.id })
      .from(packages)
      .where(eq(packages.slug, slug))
      .limit(1)
    if (row && row.id !== excludeId) throw new ConflictError('A package with that slug already exists')
  }
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toPackage(row: PackageRow, categoryName?: string): Package {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName,
    name: row.name,
    slug: row.slug,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    packageType: row.packageType,
    status: row.status as PackageStatus,
    isFeatured: row.isFeatured,
    basePrice: row.basePrice,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toDeparture(row: DepartureRow, basePrice: number): Departure {
  return {
    id: row.id,
    packageId: row.packageId,
    departureDate: row.departureDate,
    returnDate: row.returnDate,
    quota: row.quota,
    availableQuota: row.availableQuota,
    airline: row.airline,
    status: row.status as Departure['status'],
    priceOverride: row.priceOverride,
    effectivePrice: effectivePrice(basePrice, row.priceOverride),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toItinerary(row: ItineraryRow): Itinerary {
  return {
    id: row.id,
    departureId: row.departureId,
    dayNumber: row.dayNumber,
    title: row.title,
    description: row.description,
    location: row.location,
  }
}

function toFacility(row: FacilityRow): Facility {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  }
}

function toAccommodation(row: AccommodationRow): Accommodation {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    accommodationType: row.accommodationType,
    address: row.address,
    websiteUrl: row.websiteUrl,
    createdAt: row.createdAt.toISOString(),
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}
