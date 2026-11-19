import { Controller, Get, Param, Query } from '@nestjs/common'
import {
  IdParamSchema,
  ListPackagesQuerySchema,
  SlugParamSchema,
  type Category,
  type Itinerary,
  type ListPackagesQuery,
  type PackageListResponse,
} from '@app/contracts'
import { Public } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { PackagesService, type PublicPackageDetail } from './packages.service'

@Controller('public')
export class PublicPackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Public()
  @Get('categories')
  async categories(): Promise<{ items: Category[] }> {
    return this.packages.listPublicCategories()
  }

  @Public()
  @Get('packages')
  async packagesList(
    @Query(new ZodValidationPipe(ListPackagesQuerySchema)) query: ListPackagesQuery,
  ): Promise<PackageListResponse> {
    return this.packages.listPackages(query, { publicOnly: true })
  }

  @Public()
  @Get('packages/:slug')
  async packageBySlug(
    @Param(new ZodValidationPipe(SlugParamSchema)) params: { slug: string },
  ): Promise<{ package: PublicPackageDetail }> {
    return { package: await this.packages.findPublicPackageBySlug(params.slug) }
  }

  @Public()
  @Get('departures/:id/itineraries')
  async departureItineraries(
    @Param(new ZodValidationPipe(IdParamSchema)) params: { id: string },
  ): Promise<{ items: Itinerary[] }> {
    return this.packages.listPublicItineraries(params.id)
  }
}
