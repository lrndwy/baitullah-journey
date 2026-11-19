import type { ModuleManifest } from '@app/core'
import { articles, galleries, galleryImages, testimonials } from './content.schema'

export const contentManifest: ModuleManifest = {
  name: 'content',
  title: 'Content',
  description: 'Articles, galleries and testimonials for the public site.',
  version: '1.0.0',
  permissions: [
    { key: 'content.read', description: 'List and inspect content' },
    { key: 'content.write', description: 'Create, update and delete content' },
  ],
  adminNav: [
    { label: 'Artikel', path: '/admin/articles', icon: 'newspaper', permission: 'content.read' },
    { label: 'Galeri', path: '/admin/galleries', icon: 'images', permission: 'content.read' },
    {
      label: 'Testimoni',
      path: '/admin/testimonials',
      icon: 'quote',
      permission: 'content.read',
    },
  ],
  emits: [
    'content.article.created',
    'content.article.updated',
    'content.article.deleted',
    'content.gallery.created',
    'content.gallery.updated',
    'content.gallery.deleted',
    'content.testimonial.created',
    'content.testimonial.updated',
    'content.testimonial.deleted',
  ],
  tables: [articles, galleries, galleryImages, testimonials],
}
