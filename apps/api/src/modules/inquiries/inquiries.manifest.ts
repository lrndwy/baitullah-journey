import type { ModuleManifest } from '@app/core'
import { inquiries } from './inquiries.schema'

export const inquiriesManifest: ModuleManifest = {
  name: 'inquiries',
  title: 'Pemesanan',
  description: 'Formulir minat jamaah dan review status oleh tim internal.',
  version: '1.0.0',
  permissions: [
    { key: 'inquiries.read', description: 'Melihat daftar dan detail pemesanan' },
    { key: 'inquiries.write', description: 'Mengubah status dan catatan pemesanan' },
  ],
  adminNav: [
    {
      label: 'Pemesanan',
      path: '/admin/inquiries',
      icon: 'clipboard',
      permission: 'inquiries.read',
    },
  ],
  emits: ['inquiries.created', 'inquiries.status_changed'],
  tables: [inquiries],
}
