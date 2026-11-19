import { Module } from '@nestjs/common'
import {
  AccommodationsController,
  CategoriesController,
  DeparturesController,
  FacilitiesController,
  ItinerariesController,
  PackagesController,
} from './packages.controller'
import { PackagesService } from './packages.service'
import { PublicPackagesController } from './public-packages.controller'
import { SeedDemoService } from './seed-demo.service'

@Module({
  controllers: [
    CategoriesController,
    DeparturesController,
    ItinerariesController,
    FacilitiesController,
    AccommodationsController,
    PackagesController,
    PublicPackagesController,
  ],
  providers: [PackagesService, SeedDemoService],
  exports: [PackagesService],
})
export class PackagesModule {}
