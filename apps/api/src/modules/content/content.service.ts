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
  type Page,
} from '@app/core'
import type {
  Article,
  ArticleStatus,
  AssetUploadSignature,
  CompleteGalleryImageUploadInput,
  CreateArticleInput,
  CreateGalleryImageInput,
  CreateGalleryInput,
  CreateTestimonialInput,
  Gallery,
  GalleryImage,
  ImageUploadRequest,
  ListArticlesQuery,
  ListGalleriesQuery,
  ListTestimonialsQuery,
  Testimonial,
  UpdateArticleInput,
  UpdateGalleryImageInput,
  UpdateGalleryInput,
  UpdateTestimonialInput,
} from '@app/contracts'
import { and, asc, desc, eq, ilike, ne, or, sql, type SQL } from 'drizzle-orm'
import { ImageUploadService } from '../../platform/storage/image-upload.service'
import { DATABASE, EVENT_BUS } from '../../platform/tokens'
import { articles, galleries, galleryImages, testimonials } from './content.schema'
import { resolveArticlePublishedAt } from './public-filter'

type ArticleRow = typeof articles.$inferSelect
type GalleryRow = typeof galleries.$inferSelect
type GalleryImageRow = typeof galleryImages.$inferSelect

/** Object prefix for uploaded gallery images — kept under the gallery id. */
export function galleryImagePrefix(galleryId: string): string {
  return `content/galleries/${galleryId}/`
}

/** Stable browser path that redirects to a fresh presigned download. */
export function galleryImagePath(galleryId: string, imageId: string): string {
  return `/api/content/galleries/${galleryId}/images/${imageId}/file`
}

export function articleThumbnailPrefix(articleId: string): string {
  return `content/articles/${articleId}/thumbnail/`
}

export function articleThumbnailPath(articleId: string): string {
  return `/api/content/articles/${articleId}/thumbnail`
}

export function testimonialPhotoPrefix(testimonialId: string): string {
  return `content/testimonials/${testimonialId}/photo/`
}

export function testimonialPhotoPath(testimonialId: string): string {
  return `/api/content/testimonials/${testimonialId}/photo`
}

function isStoredGalleryKey(value: string): boolean {
  return value.startsWith('content/galleries/')
}

function isStoredArticleThumbnail(value: string): boolean {
  return value.startsWith('content/articles/')
}

function isStoredTestimonialPhoto(value: string): boolean {
  return value.startsWith('content/testimonials/')
}

type TestimonialRow = typeof testimonials.$inferSelect

@Injectable()
export class ContentService {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(EVENT_BUS) private readonly events: EventBus,
    private readonly images: ImageUploadService,
  ) {}

  // ── Articles ──────────────────────────────────────────────────────────────

  async listArticles(query: ListArticlesQuery, publishedOnly = false): Promise<Page<Article>> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined

    const base: SQL[] = []
    if (publishedOnly) base.push(eq(articles.status, 'published'))
    else if (query.status) base.push(eq(articles.status, query.status))
    if (query.q) {
      const pattern = `%${query.q}%`
      const search = or(ilike(articles.title, pattern), ilike(articles.excerpt, pattern))
      if (search) base.push(search)
    }

    const filters: SQL[] = [...base]
    if (position) {
      const keyset = keysetCondition(articles.createdAt, articles.id, position)
      if (keyset) filters.push(keyset)
    }

    const [countRows, rows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(articles)
        .where(base.length > 0 ? and(...base) : undefined),
      this.database.db
        .select()
        .from(articles)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(articles.createdAt), desc(articles.id))
        .limit(pageSize + 1),
    ])

    const page = buildPage(rows, pageSize, countRows[0]?.total ?? 0)
    return { ...page, items: page.items.map(toArticle) }
  }

  async findArticleById(id: string): Promise<Article> {
    const [row] = await this.database.db.select().from(articles).where(eq(articles.id, id)).limit(1)
    if (!row) throw new NotFoundError('Article not found')
    return toArticle(row)
  }

  async findPublishedArticleBySlug(slug: string): Promise<Article> {
    const [row] = await this.database.db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
      .limit(1)
    if (!row) throw new NotFoundError('Article not found')
    return toArticle(row)
  }

  async createArticle(input: CreateArticleInput, authorId: string | null): Promise<Article> {
    await this.assertUniqueArticleSlug(input.slug)

    const publishedAt = resolveArticlePublishedAt({
      status: input.status,
      publishedAt: input.publishedAt,
      existing: null,
    })

    const [row] = await this.database.db
      .insert(articles)
      .values({
        authorId,
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt ?? null,
        content: input.content ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        status: input.status,
        publishedAt,
      })
      .returning()

    if (!row) throw new Error('Failed to create article')
    await this.events.emit('content.article.created', { articleId: row.id })
    return toArticle(row)
  }

  async updateArticle(id: string, input: UpdateArticleInput): Promise<Article> {
    const existing = await this.requireArticleRow(id)
    if (input.slug !== undefined && input.slug !== existing.slug) {
      await this.assertUniqueArticleSlug(input.slug, id)
    }

    const status = (input.status ?? existing.status) as ArticleStatus
    const publishedAt = resolveArticlePublishedAt({
      status,
      publishedAt: input.publishedAt,
      existing: existing.publishedAt,
    })

    const [row] = await this.database.db
      .update(articles)
      .set({
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt === undefined ? undefined : input.excerpt,
        content: input.content === undefined ? undefined : input.content,
        thumbnailUrl: input.thumbnailUrl === undefined ? undefined : input.thumbnailUrl,
        status: input.status,
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning()

    if (!row) throw new NotFoundError('Article not found')
    await this.events.emit('content.article.updated', { articleId: id })
    return toArticle(row)
  }

  async removeArticle(id: string): Promise<void> {
    const existing = await this.requireArticleRow(id)
    await this.database.db.delete(articles).where(eq(articles.id, id))
    if (existing.thumbnailUrl && isStoredArticleThumbnail(existing.thumbnailUrl)) {
      await this.images.remove(existing.thumbnailUrl)
    }
    await this.events.emit('content.article.deleted', { articleId: id })
  }

  async signArticleThumbnail(
    articleId: string,
    input: ImageUploadRequest,
  ): Promise<AssetUploadSignature> {
    await this.requireArticleRow(articleId)
    return this.images.sign(articleThumbnailPrefix(articleId), input)
  }

  async completeArticleThumbnail(articleId: string, key: string): Promise<Article> {
    const existing = await this.requireArticleRow(articleId)
    this.images.assertKeyUnder(key, articleThumbnailPrefix(articleId))
    await this.images.verify(key)

    const [row] = await this.database.db
      .update(articles)
      .set({ thumbnailUrl: key, updatedAt: new Date() })
      .where(eq(articles.id, articleId))
      .returning()

    if (!row) throw new NotFoundError('Article not found')
    if (
      existing.thumbnailUrl &&
      existing.thumbnailUrl !== key &&
      isStoredArticleThumbnail(existing.thumbnailUrl)
    ) {
      await this.images.remove(existing.thumbnailUrl)
    }

    await this.events.emit('content.article.updated', { articleId, changed: ['thumbnail'] })
    return toArticle(row)
  }

  async clearArticleThumbnail(articleId: string): Promise<Article> {
    const existing = await this.requireArticleRow(articleId)
    const [row] = await this.database.db
      .update(articles)
      .set({ thumbnailUrl: null, updatedAt: new Date() })
      .where(eq(articles.id, articleId))
      .returning()

    if (!row) throw new NotFoundError('Article not found')
    if (existing.thumbnailUrl && isStoredArticleThumbnail(existing.thumbnailUrl)) {
      await this.images.remove(existing.thumbnailUrl)
    }

    await this.events.emit('content.article.updated', { articleId, changed: ['thumbnail'] })
    return toArticle(row)
  }

  async articleThumbnailFileUrl(articleId: string): Promise<string> {
    const row = await this.requireArticleRow(articleId)
    if (!row.thumbnailUrl || !isStoredArticleThumbnail(row.thumbnailUrl)) {
      throw new NotFoundError('That article has no uploaded thumbnail')
    }
    return this.images.presign(row.thumbnailUrl)
  }

  // ── Galleries ─────────────────────────────────────────────────────────────

  async listGalleries(query: ListGalleriesQuery, publishedOnly = false): Promise<Page<Gallery>> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined

    const base: SQL[] = []
    if (publishedOnly) base.push(eq(galleries.isPublished, true))
    else if (query.published !== undefined) base.push(eq(galleries.isPublished, query.published))

    const filters: SQL[] = [...base]
    if (position) {
      const keyset = keysetCondition(galleries.createdAt, galleries.id, position)
      if (keyset) filters.push(keyset)
    }

    const [countRows, rows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(galleries)
        .where(base.length > 0 ? and(...base) : undefined),
      this.database.db
        .select()
        .from(galleries)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(galleries.createdAt), desc(galleries.id))
        .limit(pageSize + 1),
    ])

    const page = buildPage(rows, pageSize, countRows[0]?.total ?? 0)
    return { ...page, items: page.items.map(toGallery) }
  }

  async findGalleryById(id: string, withImages = false): Promise<Gallery> {
    const [row] = await this.database.db.select().from(galleries).where(eq(galleries.id, id)).limit(1)
    if (!row) throw new NotFoundError('Gallery not found')
    const gallery = toGallery(row)
    if (!withImages) return gallery
    return { ...gallery, images: await this.listImagesForGallery(id) }
  }

  async findPublishedGalleryBySlug(slug: string): Promise<Gallery> {
    const [row] = await this.database.db
      .select()
      .from(galleries)
      .where(and(eq(galleries.slug, slug), eq(galleries.isPublished, true)))
      .limit(1)
    if (!row) throw new NotFoundError('Gallery not found')
    return {
      ...toGallery(row),
      images: await this.listImagesForGallery(row.id),
    }
  }

  async createGallery(input: CreateGalleryInput, createdBy: string | null): Promise<Gallery> {
    await this.assertUniqueGallerySlug(input.slug)

    const [row] = await this.database.db
      .insert(galleries)
      .values({
        createdBy,
        title: input.title,
        slug: input.slug,
        description: input.description ?? null,
        eventDate: input.eventDate ?? null,
        isPublished: input.isPublished,
      })
      .returning()

    if (!row) throw new Error('Failed to create gallery')
    await this.events.emit('content.gallery.created', { galleryId: row.id })
    return toGallery(row)
  }

  async updateGallery(id: string, input: UpdateGalleryInput): Promise<Gallery> {
    const existing = await this.requireGalleryRow(id)
    if (input.slug !== undefined && input.slug !== existing.slug) {
      await this.assertUniqueGallerySlug(input.slug, id)
    }

    const [row] = await this.database.db
      .update(galleries)
      .set({
        title: input.title,
        slug: input.slug,
        description: input.description === undefined ? undefined : input.description,
        eventDate: input.eventDate === undefined ? undefined : input.eventDate,
        isPublished: input.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(galleries.id, id))
      .returning()

    if (!row) throw new NotFoundError('Gallery not found')
    await this.events.emit('content.gallery.updated', { galleryId: id })
    return toGallery(row)
  }

  async removeGallery(id: string): Promise<void> {
    await this.requireGalleryRow(id)
    await this.database.db.delete(galleries).where(eq(galleries.id, id))
    await this.events.emit('content.gallery.deleted', { galleryId: id })
  }

  // ── Gallery images ────────────────────────────────────────────────────────

  async listGalleryImages(galleryId: string): Promise<GalleryImage[]> {
    await this.requireGalleryRow(galleryId)
    return this.listImagesForGallery(galleryId)
  }

  async signGalleryImage(
    galleryId: string,
    input: ImageUploadRequest,
  ): Promise<AssetUploadSignature> {
    await this.requireGalleryRow(galleryId)
    return this.images.sign(galleryImagePrefix(galleryId), input)
  }

  async completeGalleryImageUpload(
    galleryId: string,
    input: CompleteGalleryImageUploadInput,
  ): Promise<GalleryImage> {
    await this.requireGalleryRow(galleryId)
    this.images.assertKeyUnder(input.key, galleryImagePrefix(galleryId))
    await this.images.verify(input.key)

    const [row] = await this.database.db
      .insert(galleryImages)
      .values({
        galleryId,
        imageUrl: input.key,
        caption: input.caption ?? null,
        sortOrder: input.sortOrder,
      })
      .returning()

    if (!row) throw new Error('Failed to create gallery image')
    return toGalleryImage(row)
  }

  async addGalleryImage(galleryId: string, input: CreateGalleryImageInput): Promise<GalleryImage> {
    await this.requireGalleryRow(galleryId)

    const [row] = await this.database.db
      .insert(galleryImages)
      .values({
        galleryId,
        imageUrl: input.imageUrl,
        caption: input.caption ?? null,
        sortOrder: input.sortOrder,
      })
      .returning()

    if (!row) throw new Error('Failed to create gallery image')
    return toGalleryImage(row)
  }

  async updateGalleryImage(
    galleryId: string,
    imageId: string,
    input: UpdateGalleryImageInput,
  ): Promise<GalleryImage> {
    await this.requireGalleryRow(galleryId)
    const existing = await this.requireGalleryImageRow(galleryId, imageId)
    const nextKey = input.imageUrl

    const [row] = await this.database.db
      .update(galleryImages)
      .set({
        imageUrl: input.imageUrl,
        caption: input.caption === undefined ? undefined : input.caption,
        sortOrder: input.sortOrder,
      })
      .where(and(eq(galleryImages.id, imageId), eq(galleryImages.galleryId, galleryId)))
      .returning()

    if (!row) throw new NotFoundError('Gallery image not found')

    if (
      nextKey &&
      nextKey !== existing.imageUrl &&
      isStoredGalleryKey(existing.imageUrl)
    ) {
      await this.images.remove(existing.imageUrl)
    }

    return toGalleryImage(row)
  }

  async removeGalleryImage(galleryId: string, imageId: string): Promise<void> {
    await this.requireGalleryRow(galleryId)
    const deleted = await this.database.db
      .delete(galleryImages)
      .where(and(eq(galleryImages.id, imageId), eq(galleryImages.galleryId, galleryId)))
      .returning({ imageUrl: galleryImages.imageUrl })

    if (deleted.length === 0) throw new NotFoundError('Gallery image not found')
    const key = deleted[0]?.imageUrl
    if (key && isStoredGalleryKey(key)) await this.images.remove(key)
  }

  /** Resolves a gallery image to a fresh download URL for the redirect endpoint. */
  async galleryImageFileUrl(galleryId: string, imageId: string): Promise<string> {
    const row = await this.requireGalleryImageRow(galleryId, imageId)
    if (!isStoredGalleryKey(row.imageUrl)) {
      throw new NotFoundError('That gallery image is not a stored upload')
    }
    return this.images.presign(row.imageUrl)
  }

  // ── Testimonials ──────────────────────────────────────────────────────────

  async listTestimonials(
    query: ListTestimonialsQuery,
    publishedOnly = false,
  ): Promise<Page<Testimonial>> {
    const pageSize = normalizeLimit(query.limit)
    const position = query.cursor ? decodeCursor(query.cursor) : undefined

    const base: SQL[] = []
    if (publishedOnly) base.push(eq(testimonials.isPublished, true))
    else if (query.published !== undefined) base.push(eq(testimonials.isPublished, query.published))

    const filters: SQL[] = [...base]
    if (position) {
      const keyset = keysetCondition(testimonials.createdAt, testimonials.id, position)
      if (keyset) filters.push(keyset)
    }

    const [countRows, rows] = await Promise.all([
      this.database.db
        .select({ total: sql<number>`count(*)::int` })
        .from(testimonials)
        .where(base.length > 0 ? and(...base) : undefined),
      this.database.db
        .select()
        .from(testimonials)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(testimonials.createdAt), desc(testimonials.id))
        .limit(pageSize + 1),
    ])

    const page = buildPage(rows, pageSize, countRows[0]?.total ?? 0)
    return { ...page, items: page.items.map(toTestimonial) }
  }

  async findTestimonialById(id: string): Promise<Testimonial> {
    const [row] = await this.database.db
      .select()
      .from(testimonials)
      .where(eq(testimonials.id, id))
      .limit(1)
    if (!row) throw new NotFoundError('Testimonial not found')
    return toTestimonial(row)
  }

  async createTestimonial(
    input: CreateTestimonialInput,
    createdBy: string | null,
  ): Promise<Testimonial> {
    const [row] = await this.database.db
      .insert(testimonials)
      .values({
        createdBy,
        customerName: input.customerName,
        content: input.content,
        rating: input.rating,
        photoUrl: input.photoUrl ?? null,
        isPublished: input.isPublished,
      })
      .returning()

    if (!row) throw new Error('Failed to create testimonial')
    await this.events.emit('content.testimonial.created', { testimonialId: row.id })
    return toTestimonial(row)
  }

  async updateTestimonial(id: string, input: UpdateTestimonialInput): Promise<Testimonial> {
    await this.findTestimonialById(id)

    const [row] = await this.database.db
      .update(testimonials)
      .set({
        customerName: input.customerName,
        content: input.content,
        rating: input.rating,
        photoUrl: input.photoUrl === undefined ? undefined : input.photoUrl,
        isPublished: input.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(testimonials.id, id))
      .returning()

    if (!row) throw new NotFoundError('Testimonial not found')
    await this.events.emit('content.testimonial.updated', { testimonialId: id })
    return toTestimonial(row)
  }

  async removeTestimonial(id: string): Promise<void> {
    const existing = await this.requireTestimonialRow(id)
    await this.database.db.delete(testimonials).where(eq(testimonials.id, id))
    if (existing.photoUrl && isStoredTestimonialPhoto(existing.photoUrl)) {
      await this.images.remove(existing.photoUrl)
    }
    await this.events.emit('content.testimonial.deleted', { testimonialId: id })
  }

  async signTestimonialPhoto(
    testimonialId: string,
    input: ImageUploadRequest,
  ): Promise<AssetUploadSignature> {
    await this.requireTestimonialRow(testimonialId)
    return this.images.sign(testimonialPhotoPrefix(testimonialId), input)
  }

  async completeTestimonialPhoto(testimonialId: string, key: string): Promise<Testimonial> {
    const existing = await this.requireTestimonialRow(testimonialId)
    this.images.assertKeyUnder(key, testimonialPhotoPrefix(testimonialId))
    await this.images.verify(key)

    const [row] = await this.database.db
      .update(testimonials)
      .set({ photoUrl: key, updatedAt: new Date() })
      .where(eq(testimonials.id, testimonialId))
      .returning()

    if (!row) throw new NotFoundError('Testimonial not found')
    if (
      existing.photoUrl &&
      existing.photoUrl !== key &&
      isStoredTestimonialPhoto(existing.photoUrl)
    ) {
      await this.images.remove(existing.photoUrl)
    }

    await this.events.emit('content.testimonial.updated', {
      testimonialId,
      changed: ['photo'],
    })
    return toTestimonial(row)
  }

  async clearTestimonialPhoto(testimonialId: string): Promise<Testimonial> {
    const existing = await this.requireTestimonialRow(testimonialId)
    const [row] = await this.database.db
      .update(testimonials)
      .set({ photoUrl: null, updatedAt: new Date() })
      .where(eq(testimonials.id, testimonialId))
      .returning()

    if (!row) throw new NotFoundError('Testimonial not found')
    if (existing.photoUrl && isStoredTestimonialPhoto(existing.photoUrl)) {
      await this.images.remove(existing.photoUrl)
    }

    await this.events.emit('content.testimonial.updated', {
      testimonialId,
      changed: ['photo'],
    })
    return toTestimonial(row)
  }

  async testimonialPhotoFileUrl(testimonialId: string): Promise<string> {
    const row = await this.requireTestimonialRow(testimonialId)
    if (!row.photoUrl || !isStoredTestimonialPhoto(row.photoUrl)) {
      throw new NotFoundError('That testimonial has no uploaded photo')
    }
    return this.images.presign(row.photoUrl)
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async listImagesForGallery(galleryId: string): Promise<GalleryImage[]> {
    const rows = await this.database.db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.galleryId, galleryId))
      .orderBy(asc(galleryImages.sortOrder), asc(galleryImages.id))
    return rows.map(toGalleryImage)
  }

  private async requireArticleRow(id: string): Promise<ArticleRow> {
    const [row] = await this.database.db.select().from(articles).where(eq(articles.id, id)).limit(1)
    if (!row) throw new NotFoundError('Article not found')
    return row
  }

  private async requireTestimonialRow(id: string): Promise<TestimonialRow> {
    const [row] = await this.database.db
      .select()
      .from(testimonials)
      .where(eq(testimonials.id, id))
      .limit(1)
    if (!row) throw new NotFoundError('Testimonial not found')
    return row
  }

  private async requireGalleryRow(id: string): Promise<GalleryRow> {
    const [row] = await this.database.db.select().from(galleries).where(eq(galleries.id, id)).limit(1)
    if (!row) throw new NotFoundError('Gallery not found')
    return row
  }

  private async requireGalleryImageRow(
    galleryId: string,
    imageId: string,
  ): Promise<GalleryImageRow> {
    const [row] = await this.database.db
      .select()
      .from(galleryImages)
      .where(and(eq(galleryImages.id, imageId), eq(galleryImages.galleryId, galleryId)))
      .limit(1)
    if (!row) throw new NotFoundError('Gallery image not found')
    return row
  }

  private async assertUniqueArticleSlug(slug: string, exceptId?: string): Promise<void> {
    const conditions: SQL[] = [eq(articles.slug, slug)]
    if (exceptId) conditions.push(ne(articles.id, exceptId))
    const [existing] = await this.database.db
      .select({ id: articles.id })
      .from(articles)
      .where(and(...conditions))
      .limit(1)
    if (existing) throw new ConflictError('An article with that slug already exists')
  }

  private async assertUniqueGallerySlug(slug: string, exceptId?: string): Promise<void> {
    const conditions: SQL[] = [eq(galleries.slug, slug)]
    if (exceptId) conditions.push(ne(galleries.id, exceptId))
    const [existing] = await this.database.db
      .select({ id: galleries.id })
      .from(galleries)
      .where(and(...conditions))
      .limit(1)
    if (existing) throw new ConflictError('A gallery with that slug already exists')
  }
}

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    authorId: row.authorId,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    thumbnailUrl:
      row.thumbnailUrl && isStoredArticleThumbnail(row.thumbnailUrl)
        ? articleThumbnailPath(row.id)
        : row.thumbnailUrl,
    status: row.status as ArticleStatus,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toGallery(row: GalleryRow): Gallery {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    eventDate: row.eventDate,
    isPublished: row.isPublished,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toGalleryImage(row: GalleryImageRow): GalleryImage {
  return {
    id: row.id,
    galleryId: row.galleryId,
    imageUrl: isStoredGalleryKey(row.imageUrl)
      ? galleryImagePath(row.galleryId, row.id)
      : row.imageUrl,
    caption: row.caption,
    sortOrder: row.sortOrder,
  }
}

function toTestimonial(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    customerName: row.customerName,
    content: row.content,
    rating: row.rating,
    photoUrl:
      row.photoUrl && isStoredTestimonialPhoto(row.photoUrl)
        ? testimonialPhotoPath(row.id)
        : row.photoUrl,
    isPublished: row.isPublished,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
