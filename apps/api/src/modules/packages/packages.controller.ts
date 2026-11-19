import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import {
  CreateAccommodationSchema,
  CreateCategorySchema,
  CreateDepartureSchema,
  CreateFacilitySchema,
  CreateItinerarySchema,
  CreatePackageSchema,
  IdParamSchema,
  ListPackagesQuerySchema,
  PaginationQuerySchema,
  UpdateAccommodationSchema,
  UpdateCategorySchema,
  UpdateDepartureSchema,
  UpdateFacilitySchema,
  UpdateItinerarySchema,
  UpdatePackageSchema,
  UuidSchema,
  type Accommodation,
  type AccommodationListResponse,
  type Category,
  type CategoryListResponse,
  type CreateAccommodationInput,
  type CreateCategoryInput,
  type CreateDepartureInput,
  type CreateFacilityInput,
  type CreateItineraryInput,
  type CreatePackageInput,
  type Departure,
  type DepartureListResponse,
  type Facility,
  type FacilityListResponse,
  type Itinerary,
  type ListPackagesQuery,
  type PackageDetail,
  type PackageListResponse,
  type PaginationQuery,
  type UpdateAccommodationInput,
  type UpdateCategoryInput,
  type UpdateDepartureInput,
  type UpdateFacilityInput,
  type UpdateItineraryInput,
  type UpdatePackageInput,
} from '@app/contracts'
import type { AuthPrincipal } from '@app/core'
import { z } from 'zod'
import { AuditAction, CurrentPrincipal, RequirePermissions } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { PackagesService } from './packages.service'

const ListDeparturesQuerySchema = PaginationQuerySchema.extend({
  packageId: UuidSchema.optional(),
})

const ListItinerariesQuerySchema = z.object({
  departureId: UuidSchema,
})

@Controller('packages/categories')
export class CategoriesController {
  constructor(private readonly packages: PackagesService) {}

  @RequirePermissions('packages.read')
  @Get()
  async list(
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQuery,
  ): Promise<CategoryListResponse> {
    return this.packages.listCategories(query)
  }

  @RequirePermissions('packages.read')
  @Get(':id')
  async findOne(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ category: Category }> {
    return { category: await this.packages.findCategory(params.id) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.category.create')
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateCategorySchema)) body: CreateCategoryInput,
  ): Promise<{ category: Category }> {
    return { category: await this.packages.createCategory(body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.category.update')
  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateCategorySchema)) body: UpdateCategoryInput,
  ): Promise<{ category: Category }> {
    return { category: await this.packages.updateCategory(params.id, body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.category.delete')
  @Delete(':id')
  async remove(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.packages.removeCategory(params.id)
    return { ok: true }
  }
}

@Controller('packages')
export class PackagesController {
  constructor(private readonly packages: PackagesService) {}

  @RequirePermissions('packages.read')
  @Get()
  async list(
    @Query(new ZodValidationPipe(ListPackagesQuerySchema)) query: ListPackagesQuery,
  ): Promise<PackageListResponse> {
    return this.packages.listPackages(query)
  }

  @RequirePermissions('packages.read')
  @Get(':id')
  async findOne(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ package: PackageDetail }> {
    return { package: await this.packages.findPackage(params.id) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.create')
  @Post()
  async create(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(CreatePackageSchema)) body: CreatePackageInput,
  ): Promise<{ package: PackageDetail }> {
    return { package: await this.packages.createPackage(body, principal.userId) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.update')
  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdatePackageSchema)) body: UpdatePackageInput,
  ): Promise<{ package: PackageDetail }> {
    return { package: await this.packages.updatePackage(params.id, body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.delete')
  @Delete(':id')
  async remove(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.packages.removePackage(params.id)
    return { ok: true }
  }
}

@Controller('packages/departures')
export class DeparturesController {
  constructor(private readonly packages: PackagesService) {}

  @RequirePermissions('packages.read')
  @Get()
  async list(
    @Query(new ZodValidationPipe(ListDeparturesQuerySchema)) query: z.infer<typeof ListDeparturesQuerySchema>,
  ): Promise<DepartureListResponse> {
    return this.packages.listDepartures(query)
  }

  @RequirePermissions('packages.read')
  @Get(':id')
  async findOne(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ departure: Departure }> {
    return { departure: await this.packages.findDeparture(params.id) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.departure.create')
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateDepartureSchema)) body: CreateDepartureInput,
  ): Promise<{ departure: Departure }> {
    return { departure: await this.packages.createDeparture(body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.departure.update')
  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateDepartureSchema)) body: UpdateDepartureInput,
  ): Promise<{ departure: Departure }> {
    return { departure: await this.packages.updateDeparture(params.id, body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.departure.delete')
  @Delete(':id')
  async remove(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.packages.removeDeparture(params.id)
    return { ok: true }
  }
}

@Controller('packages/itineraries')
export class ItinerariesController {
  constructor(private readonly packages: PackagesService) {}

  @RequirePermissions('packages.read')
  @Get()
  async list(
    @Query(new ZodValidationPipe(ListItinerariesQuerySchema)) query: { departureId: string },
  ): Promise<{ items: Itinerary[] }> {
    return this.packages.listItineraries(query.departureId)
  }

  @RequirePermissions('packages.read')
  @Get(':id')
  async findOne(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ itinerary: Itinerary }> {
    return { itinerary: await this.packages.findItinerary(params.id) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.itinerary.create')
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateItinerarySchema)) body: CreateItineraryInput,
  ): Promise<{ itinerary: Itinerary }> {
    return { itinerary: await this.packages.createItinerary(body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.itinerary.update')
  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateItinerarySchema)) body: UpdateItineraryInput,
  ): Promise<{ itinerary: Itinerary }> {
    return { itinerary: await this.packages.updateItinerary(params.id, body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.itinerary.delete')
  @Delete(':id')
  async remove(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.packages.removeItinerary(params.id)
    return { ok: true }
  }
}

@Controller('packages/facilities')
export class FacilitiesController {
  constructor(private readonly packages: PackagesService) {}

  @RequirePermissions('packages.read')
  @Get()
  async list(
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQuery,
  ): Promise<FacilityListResponse> {
    return this.packages.listFacilities(query)
  }

  @RequirePermissions('packages.read')
  @Get(':id')
  async findOne(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ facility: Facility }> {
    return { facility: await this.packages.findFacility(params.id) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.facility.create')
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateFacilitySchema)) body: CreateFacilityInput,
  ): Promise<{ facility: Facility }> {
    return { facility: await this.packages.createFacility(body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.facility.update')
  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateFacilitySchema)) body: UpdateFacilityInput,
  ): Promise<{ facility: Facility }> {
    return { facility: await this.packages.updateFacility(params.id, body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.facility.delete')
  @Delete(':id')
  async remove(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.packages.removeFacility(params.id)
    return { ok: true }
  }
}

@Controller('packages/accommodations')
export class AccommodationsController {
  constructor(private readonly packages: PackagesService) {}

  @RequirePermissions('packages.read')
  @Get()
  async list(
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQuery,
  ): Promise<AccommodationListResponse> {
    return this.packages.listAccommodations(query)
  }

  @RequirePermissions('packages.read')
  @Get(':id')
  async findOne(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ accommodation: Accommodation }> {
    return { accommodation: await this.packages.findAccommodation(params.id) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.accommodation.create')
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateAccommodationSchema)) body: CreateAccommodationInput,
  ): Promise<{ accommodation: Accommodation }> {
    return { accommodation: await this.packages.createAccommodation(body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.accommodation.update')
  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateAccommodationSchema)) body: UpdateAccommodationInput,
  ): Promise<{ accommodation: Accommodation }> {
    return { accommodation: await this.packages.updateAccommodation(params.id, body) }
  }

  @RequirePermissions('packages.write')
  @AuditAction('packages.accommodation.delete')
  @Delete(':id')
  async remove(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.packages.removeAccommodation(params.id)
    return { ok: true }
  }
}
