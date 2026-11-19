import { Controller, Get, Param, Query } from '@nestjs/common'
import {
  ContentSlugParamSchema,
  ListArticlesQuerySchema,
  ListGalleriesQuerySchema,
  ListTestimonialsQuerySchema,
  type Article,
  type ArticleListResponse,
  type Gallery,
  type GalleryListResponse,
  type ListArticlesQuery,
  type ListGalleriesQuery,
  type ListTestimonialsQuery,
  type TestimonialListResponse,
} from '@app/contracts'
import { Public } from '../../platform/security/decorators'
import { ZodValidationPipe } from '../../platform/validation/zod.pipe'
import { ContentService } from './content.service'

@Controller('public')
@Public()
export class PublicContentController {
  constructor(private readonly content: ContentService) {}

  @Get('articles')
  async listArticles(
    @Query(new ZodValidationPipe(ListArticlesQuerySchema)) query: ListArticlesQuery,
  ): Promise<ArticleListResponse> {
    return this.content.listArticles(query, true)
  }

  @Get('articles/:slug')
  async getArticle(
    @Param(new ZodValidationPipe(ContentSlugParamSchema)) params: { slug: string },
  ): Promise<{ article: Article }> {
    return { article: await this.content.findPublishedArticleBySlug(params.slug) }
  }

  @Get('galleries')
  async listGalleries(
    @Query(new ZodValidationPipe(ListGalleriesQuerySchema)) query: ListGalleriesQuery,
  ): Promise<GalleryListResponse> {
    return this.content.listGalleries(query, true)
  }

  @Get('galleries/:slug')
  async getGallery(
    @Param(new ZodValidationPipe(ContentSlugParamSchema)) params: { slug: string },
  ): Promise<{ gallery: Gallery }> {
    return { gallery: await this.content.findPublishedGalleryBySlug(params.slug) }
  }

  @Get('testimonials')
  async listTestimonials(
    @Query(new ZodValidationPipe(ListTestimonialsQuerySchema)) query: ListTestimonialsQuery,
  ): Promise<TestimonialListResponse> {
    return this.content.listTestimonials(query, true)
  }
}
