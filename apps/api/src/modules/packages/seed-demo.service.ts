import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common'
import { createLogger, getEnv, type DatabaseHandle } from '@app/core'
import { count, isNotNull, sql } from 'drizzle-orm'
import { DATABASE } from '../../platform/tokens'
import {
  articles,
  galleries,
  galleryImages,
  testimonials,
} from '../content/content.schema'
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
import {
  ACCOMMODATION_SEED,
  ARTICLE_SEED,
  CATEGORY_SEED,
  FACILITY_SEED,
  GALLERY_SEED,
  PACKAGE_SEED,
  SETTINGS_SEED,
  TESTIMONIAL_SEED,
} from './seed-demo-data'

const logger = createLogger('seed-demo')

/**
 * Inserts a rich demo catalogue when empty (or when forced / thin).
 * Gated to non-production so deployments never inherit demo content by accident.
 *
 * Reseed triggers:
 * - empty categories
 * - `SEED_DEMO_FORCE=1`
 * - packages exist but none have `thumbnail_url` (legacy thin seed)
 */
@Injectable()
export class SeedDemoService implements OnApplicationBootstrap {
  constructor(@Inject(DATABASE) private readonly database: DatabaseHandle) {}

  async onApplicationBootstrap(): Promise<void> {
    if (getEnv().NODE_ENV === 'production') return

    const force = process.env.SEED_DEMO_FORCE === '1'
    const categoryCount = Number(
      (await this.database.db.select({ value: count() }).from(categories))[0]?.value ?? 0,
    )
    const packageCount = Number(
      (await this.database.db.select({ value: count() }).from(packages))[0]?.value ?? 0,
    )
    const thumbCount = Number(
      (
        await this.database.db
          .select({ value: count() })
          .from(packages)
          .where(isNotNull(packages.thumbnailUrl))
      )[0]?.value ?? 0,
    )

    const thin = packageCount > 0 && thumbCount === 0

    if (categoryCount > 0 && !force && !thin) {
      logger.info('demo seed skipped — catalogue already present')
      return
    }

    if (categoryCount > 0 && (force || thin)) {
      logger.info(
        force ? 'SEED_DEMO_FORCE=1 — wiping demo tables' : 'thin demo detected — reseeding with images',
      )
      await this.wipeDemoTables()
    }

    await this.seedAll()
    logger.info('demo catalogue seeded (packages, content, settings)')
  }

  private async wipeDemoTables(): Promise<void> {
    await this.database.db.execute(sql`
      truncate table
        inquiries.inquiries,
        content.gallery_images,
        content.galleries,
        content.articles,
        content.testimonials,
        packages.itineraries,
        packages.departures,
        packages.package_facilities,
        packages.package_accommodations,
        packages.packages,
        packages.accommodations,
        packages.facilities,
        packages.categories
      restart identity cascade
    `)
  }

  private async seedAll(): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      const categoryBySlug = new Map<string, string>()
      for (const cat of CATEGORY_SEED) {
        const [row] = await tx.insert(categories).values(cat).returning()
        categoryBySlug.set(cat.slug, row!.id)
      }

      const facilityByName = new Map<string, string>()
      for (const facility of FACILITY_SEED) {
        const [row] = await tx.insert(facilities).values(facility).returning()
        facilityByName.set(facility.name, row!.id)
      }

      const hotelByName = new Map<string, string>()
      for (const hotel of ACCOMMODATION_SEED) {
        const [row] = await tx.insert(accommodations).values(hotel).returning()
        hotelByName.set(hotel.name, row!.id)
      }

      for (const spec of PACKAGE_SEED) {
        const categoryId = categoryBySlug.get(spec.categorySlug)
        if (!categoryId) throw new Error(`Missing category ${spec.categorySlug}`)

        const [pkg] = await tx
          .insert(packages)
          .values({
            categoryId,
            name: spec.name,
            slug: spec.slug,
            description: spec.description,
            thumbnailUrl: spec.thumbnailUrl,
            packageType: spec.packageType,
            status: 'published',
            isFeatured: spec.isFeatured,
            basePrice: spec.basePrice,
            currency: 'IDR',
          })
          .returning()

        const facilityIds = spec.facilityNames
          .map((name) => facilityByName.get(name))
          .filter((id): id is string => Boolean(id))
        if (facilityIds.length > 0) {
          await tx.insert(packageFacilities).values(
            facilityIds.map((facilityId) => ({ packageId: pkg!.id, facilityId })),
          )
        }

        for (const stay of spec.stays) {
          const accommodationId = hotelByName.get(stay.hotel)
          if (!accommodationId) throw new Error(`Missing hotel ${stay.hotel}`)
          await tx.insert(packageAccommodations).values({
            packageId: pkg!.id,
            accommodationId,
            accommodationRole: stay.role,
            nights: stay.nights,
          })
        }

        for (const dep of spec.departures) {
          const [departure] = await tx
            .insert(departures)
            .values({
              packageId: pkg!.id,
              departureDate: dep.departureDate,
              returnDate: dep.returnDate,
              quota: dep.quota,
              availableQuota: dep.availableQuota,
              airline: dep.airline,
              status: dep.status,
              priceOverride: dep.priceOverride ?? null,
            })
            .returning()

          await tx.insert(itineraries).values(
            dep.days.map((day) => ({
              departureId: departure!.id,
              dayNumber: day.dayNumber,
              title: day.title,
              description: day.description,
              location: day.location,
            })),
          )
        }
      }

      await tx.insert(articles).values(
        ARTICLE_SEED.map((article) => ({
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content,
          thumbnailUrl: article.thumbnailUrl,
          status: 'published',
          publishedAt: new Date(),
        })),
      )

      for (const gallery of GALLERY_SEED) {
        const [row] = await tx
          .insert(galleries)
          .values({
            title: gallery.title,
            slug: gallery.slug,
            description: gallery.description,
            eventDate: gallery.eventDate,
            isPublished: true,
          })
          .returning()

        await tx.insert(galleryImages).values(
          gallery.images.map((image, index) => ({
            galleryId: row!.id,
            imageUrl: image.imageUrl,
            caption: image.caption,
            sortOrder: index,
          })),
        )
      }

      await tx.insert(testimonials).values(
        TESTIMONIAL_SEED.map((item) => ({
          customerName: item.customerName,
          content: item.content,
          rating: item.rating,
          photoUrl: item.photoUrl,
          isPublished: true,
        })),
      )

      await tx.execute(sql`
        insert into settings.app_settings (
          id, site_name, tagline, whatsapp, phone, email, address, license, about_html, updated_at
        ) values (
          'default',
          ${SETTINGS_SEED.siteName},
          ${SETTINGS_SEED.tagline},
          ${SETTINGS_SEED.whatsapp},
          ${SETTINGS_SEED.phone},
          ${SETTINGS_SEED.email},
          ${SETTINGS_SEED.address},
          ${SETTINGS_SEED.license},
          ${SETTINGS_SEED.aboutHtml},
          now()
        )
        on conflict (id) do update set
          site_name = excluded.site_name,
          tagline = excluded.tagline,
          whatsapp = excluded.whatsapp,
          phone = excluded.phone,
          email = excluded.email,
          address = excluded.address,
          license = excluded.license,
          about_html = excluded.about_html,
          updated_at = now()
      `)
    })
  }
}
