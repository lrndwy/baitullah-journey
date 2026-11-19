import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common'
import {
  AssetCompleteSchema,
  CompleteGalleryImageUploadSchema,
  ContentIdParamSchema,
  CreateArticleSchema,
  CreateGalleryImageSchema,
  CreateGallerySchema,
  CreateTestimonialSchema,
  ImageUploadRequestSchema,
  ListArticlesQuerySchema,
  ListGalleriesQuerySchema,
  ListTestimonialsQuerySchema,
  UpdateArticleSchema,
  UpdateGalleryImageSchema,
  UpdateGallerySchema,
  UpdateTestimonialSchema,
  type Article,
  type ArticleListResponse,
  type AssetCompleteInput,
  type AssetUploadSignature,
  type CompleteGalleryImageUploadInput,
  type CreateArticleInput,
  type CreateGalleryImageInput,
  type CreateGalleryInput,
  type CreateTestimonialInput,
  type Gallery,
  type GalleryImage,
  type GalleryListResponse,
  type ImageUploadRequest,
  type ListArticlesQuery,
  type ListGalleriesQuery,
  type ListTestimonialsQuery,
  type Testimonial,
  type TestimonialListResponse,
  type UpdateArticleInput,
  type UpdateGalleryImageInput,
  type UpdateGalleryInput,
  type UpdateTestimonialInput,
} from '@app/contracts'
import type { AuthPrincipal } from '@app/core'
import type { Response } from 'express'
import { z } from 'zod'
import {
  AuditAction,
  CurrentPrincipal,
  Public,
  RequirePermissions,
} from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { ContentService } from './content.service'

const GalleryImageParamsSchema = z.object({
  id: ContentIdParamSchema.shape.id,
  imageId: ContentIdParamSchema.shape.id,
})

@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  // ── Articles ──────────────────────────────────────────────────────────────

  @RequirePermissions('content.read')
  @Get('articles')
  async listArticles(
    @Query(new ZodValidationPipe(ListArticlesQuerySchema)) query: ListArticlesQuery,
  ): Promise<ArticleListResponse> {
    return this.content.listArticles(query)
  }

  @RequirePermissions('content.read')
  @Get('articles/:id')
  async getArticle(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
  ): Promise<{ article: Article }> {
    return { article: await this.content.findArticleById(params.id) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.article.create')
  @Post('articles')
  async createArticle(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(CreateArticleSchema)) body: CreateArticleInput,
  ): Promise<{ article: Article }> {
    return { article: await this.content.createArticle(body, principal.userId) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.article.update')
  @Patch('articles/:id')
  async updateArticle(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateArticleSchema)) body: UpdateArticleInput,
  ): Promise<{ article: Article }> {
    return { article: await this.content.updateArticle(params.id, body) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.article.delete')
  @Delete('articles/:id')
  async removeArticle(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.content.removeArticle(params.id)
    return { ok: true }
  }

  @Public()
  @Get('articles/:id/thumbnail')
  async articleThumbnail(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.content.articleThumbnailFileUrl(params.id)
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    response.redirect(302, url)
  }

  @RequirePermissions('content.write')
  @AuditAction('content.article.thumbnail.sign')
  @Post('articles/:id/thumbnail/upload-url')
  async signArticleThumbnail(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(ImageUploadRequestSchema)) body: ImageUploadRequest,
  ): Promise<AssetUploadSignature> {
    return this.content.signArticleThumbnail(params.id, body)
  }

  @RequirePermissions('content.write')
  @AuditAction('content.article.thumbnail.upload')
  @Post('articles/:id/thumbnail/complete')
  async completeArticleThumbnail(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(AssetCompleteSchema)) body: AssetCompleteInput,
  ): Promise<{ article: Article }> {
    return { article: await this.content.completeArticleThumbnail(params.id, body.key) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.article.thumbnail.clear')
  @Delete('articles/:id/thumbnail')
  async clearArticleThumbnail(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
  ): Promise<{ article: Article }> {
    return { article: await this.content.clearArticleThumbnail(params.id) }
  }

  // ── Galleries ─────────────────────────────────────────────────────────────

  @RequirePermissions('content.read')
  @Get('galleries')
  async listGalleries(
    @Query(new ZodValidationPipe(ListGalleriesQuerySchema)) query: ListGalleriesQuery,
  ): Promise<GalleryListResponse> {
    return this.content.listGalleries(query)
  }

  @RequirePermissions('content.read')
  @Get('galleries/:id')
  async getGallery(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
  ): Promise<{ gallery: Gallery }> {
    return { gallery: await this.content.findGalleryById(params.id, true) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.gallery.create')
  @Post('galleries')
  async createGallery(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(CreateGallerySchema)) body: CreateGalleryInput,
  ): Promise<{ gallery: Gallery }> {
    return { gallery: await this.content.createGallery(body, principal.userId) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.gallery.update')
  @Patch('galleries/:id')
  async updateGallery(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateGallerySchema)) body: UpdateGalleryInput,
  ): Promise<{ gallery: Gallery }> {
    return { gallery: await this.content.updateGallery(params.id, body) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.gallery.delete')
  @Delete('galleries/:id')
  async removeGallery(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.content.removeGallery(params.id)
    return { ok: true }
  }

  // ── Gallery images ────────────────────────────────────────────────────────

  @RequirePermissions('content.read')
  @Get('galleries/:id/images')
  async listGalleryImages(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
  ): Promise<{ images: GalleryImage[] }> {
    return { images: await this.content.listGalleryImages(params.id) }
  }

  /**
   * Public redirect to a fresh presigned download. Same CORP relaxation as
   * settings assets — gallery images are embedded by the public site.
   */
  @Public()
  @Get('galleries/:id/images/:imageId/file')
  async galleryImageFile(
    @Param(new ZodValidationPipe(GalleryImageParamsSchema)) params: { id: string; imageId: string },
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.content.galleryImageFileUrl(params.id, params.imageId)
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    response.redirect(302, url)
  }

  @RequirePermissions('content.write')
  @AuditAction('content.gallery_image.sign')
  @Post('galleries/:id/images/upload-url')
  async signGalleryImage(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(ImageUploadRequestSchema)) body: ImageUploadRequest,
  ): Promise<AssetUploadSignature> {
    return this.content.signGalleryImage(params.id, body)
  }

  @RequirePermissions('content.write')
  @AuditAction('content.gallery_image.upload')
  @Post('galleries/:id/images/complete')
  async completeGalleryImageUpload(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(CompleteGalleryImageUploadSchema))
    body: CompleteGalleryImageUploadInput,
  ): Promise<{ image: GalleryImage }> {
    return { image: await this.content.completeGalleryImageUpload(params.id, body) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.gallery_image.create')
  @Post('galleries/:id/images')
  async addGalleryImage(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(CreateGalleryImageSchema)) body: CreateGalleryImageInput,
  ): Promise<{ image: GalleryImage }> {
    return { image: await this.content.addGalleryImage(params.id, body) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.gallery_image.update')
  @Patch('galleries/:id/images/:imageId')
  async updateGalleryImage(
    @Param(new ZodValidationPipe(GalleryImageParamsSchema)) params: { id: string; imageId: string },
    @Body(new ZodValidationPipe(UpdateGalleryImageSchema)) body: UpdateGalleryImageInput,
  ): Promise<{ image: GalleryImage }> {
    return { image: await this.content.updateGalleryImage(params.id, params.imageId, body) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.gallery_image.delete')
  @Delete('galleries/:id/images/:imageId')
  async removeGalleryImage(
    @Param(new ZodValidationPipe(GalleryImageParamsSchema)) params: { id: string; imageId: string },
  ): Promise<{ ok: true }> {
    await this.content.removeGalleryImage(params.id, params.imageId)
    return { ok: true }
  }

  // ── Testimonials ──────────────────────────────────────────────────────────

  @RequirePermissions('content.read')
  @Get('testimonials')
  async listTestimonials(
    @Query(new ZodValidationPipe(ListTestimonialsQuerySchema)) query: ListTestimonialsQuery,
  ): Promise<TestimonialListResponse> {
    return this.content.listTestimonials(query)
  }

  @RequirePermissions('content.read')
  @Get('testimonials/:id')
  async getTestimonial(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
  ): Promise<{ testimonial: Testimonial }> {
    return { testimonial: await this.content.findTestimonialById(params.id) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.testimonial.create')
  @Post('testimonials')
  async createTestimonial(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(CreateTestimonialSchema)) body: CreateTestimonialInput,
  ): Promise<{ testimonial: Testimonial }> {
    return { testimonial: await this.content.createTestimonial(body, principal.userId) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.testimonial.update')
  @Patch('testimonials/:id')
  async updateTestimonial(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(UpdateTestimonialSchema)) body: UpdateTestimonialInput,
  ): Promise<{ testimonial: Testimonial }> {
    return { testimonial: await this.content.updateTestimonial(params.id, body) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.testimonial.delete')
  @Delete('testimonials/:id')
  async removeTestimonial(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
  ): Promise<{ ok: true }> {
    await this.content.removeTestimonial(params.id)
    return { ok: true }
  }

  @Public()
  @Get('testimonials/:id/photo')
  async testimonialPhoto(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.content.testimonialPhotoFileUrl(params.id)
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    response.redirect(302, url)
  }

  @RequirePermissions('content.write')
  @AuditAction('content.testimonial.photo.sign')
  @Post('testimonials/:id/photo/upload-url')
  async signTestimonialPhoto(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(ImageUploadRequestSchema)) body: ImageUploadRequest,
  ): Promise<AssetUploadSignature> {
    return this.content.signTestimonialPhoto(params.id, body)
  }

  @RequirePermissions('content.write')
  @AuditAction('content.testimonial.photo.upload')
  @Post('testimonials/:id/photo/complete')
  async completeTestimonialPhoto(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(AssetCompleteSchema)) body: AssetCompleteInput,
  ): Promise<{ testimonial: Testimonial }> {
    return { testimonial: await this.content.completeTestimonialPhoto(params.id, body.key) }
  }

  @RequirePermissions('content.write')
  @AuditAction('content.testimonial.photo.clear')
  @Delete('testimonials/:id/photo')
  async clearTestimonialPhoto(
    @Param(new ZodValidationPipe(ContentIdParamSchema)) params: { id: string },
  ): Promise<{ testimonial: Testimonial }> {
    return { testimonial: await this.content.clearTestimonialPhoto(params.id) }
  }
}
