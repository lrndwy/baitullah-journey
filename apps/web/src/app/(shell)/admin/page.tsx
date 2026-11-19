'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  ClipboardListIcon,
  ImagesIcon,
  InboxIcon,
  NewspaperIcon,
  PackageIcon,
  QuoteIcon,
} from 'lucide-react'
import type { StatTone } from '@/components/admin/gradient-stat-card'
import type {
  ArticleListResponse,
  GalleryListResponse,
  InquiryListResponse,
  PackageListResponse,
  TestimonialListResponse,
} from '@app/contracts'
import { GradientStatCard } from '@/components/admin/gradient-stat-card'
import { PageHeader } from '@/components/admin/page-header'
import { apiFetch } from '@/lib/api'
import { useSession } from '@/lib/session'

type Counts = {
  packages: number | null
  inquiriesNew: number | null
  inquiriesAll: number | null
  articles: number | null
  galleries: number | null
  testimonials: number | null
}

export default function AdminOverviewPage() {
  const { can } = useSession()
  const [counts, setCounts] = useState<Counts>({
    packages: null,
    inquiriesNew: null,
    inquiriesAll: null,
    articles: null,
    galleries: null,
    testimonials: null,
  })

  useEffect(() => {
    const load = async () => {
      const next: Counts = {
        packages: null,
        inquiriesNew: null,
        inquiriesAll: null,
        articles: null,
        galleries: null,
        testimonials: null,
      }

      if (can('packages.read')) {
        try {
          const page = await apiFetch<PackageListResponse>('/api/packages?limit=1')
          next.packages = page.total
        } catch {
          next.packages = null
        }
      }

      if (can('inquiries.read')) {
        try {
          const [baru, semua] = await Promise.all([
            apiFetch<InquiryListResponse>('/api/inquiries?limit=1&status=baru'),
            apiFetch<InquiryListResponse>('/api/inquiries?limit=1'),
          ])
          next.inquiriesNew = baru.total
          next.inquiriesAll = semua.total
        } catch {
          next.inquiriesNew = null
          next.inquiriesAll = null
        }
      }

      if (can('content.read')) {
        try {
          const [articles, galleries, testimonials] = await Promise.all([
            apiFetch<ArticleListResponse>('/api/content/articles?limit=1'),
            apiFetch<GalleryListResponse>('/api/content/galleries?limit=1'),
            apiFetch<TestimonialListResponse>('/api/content/testimonials?limit=1'),
          ])
          next.articles = articles.total
          next.galleries = galleries.total
          next.testimonials = testimonials.total
        } catch {
          next.articles = null
          next.galleries = null
          next.testimonials = null
        }
      }

      setCounts(next)
    }

    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cards: {
    key: string
    tone: StatTone
    label: string
    value: number | string
    hint: string
    icon: ReactNode
  }[] = []

  if (can('packages.read')) {
    cards.push({
      key: 'packages',
      tone: 'violet',
      label: 'Paket',
      value: counts.packages ?? '—',
      hint: 'Total di katalog',
      icon: <PackageIcon />,
    })
  }
  if (can('inquiries.read')) {
    cards.push(
      {
        key: 'inquiries-new',
        tone: 'amber',
        label: 'Pemesanan baru',
        value: counts.inquiriesNew ?? '—',
        hint: 'Perlu follow-up',
        icon: <InboxIcon />,
      },
      {
        key: 'inquiries-all',
        tone: 'sky',
        label: 'Semua pemesanan',
        value: counts.inquiriesAll ?? '—',
        hint: 'Total permintaan masuk',
        icon: <ClipboardListIcon />,
      },
    )
  }
  if (can('content.read')) {
    cards.push(
      {
        key: 'articles',
        tone: 'emerald',
        label: 'Artikel',
        value: counts.articles ?? '—',
        hint: 'Panduan & konten',
        icon: <NewspaperIcon />,
      },
      {
        key: 'galleries',
        tone: 'violet',
        label: 'Galeri',
        value: counts.galleries ?? '—',
        hint: 'Album kegiatan',
        icon: <ImagesIcon />,
      },
      {
        key: 'testimonials',
        tone: 'amber',
        label: 'Testimoni',
        value: counts.testimonials ?? '—',
        hint: 'Ulasan jamaah',
        icon: <QuoteIcon />,
      },
    )
  }

  return (
    <>
      <PageHeader
        title="Overview"
        description="Ringkasan operasional Baitullah Journey — paket, pemesanan, dan konten."
      />

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada ringkasan yang bisa ditampilkan untuk peran Anda.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <GradientStatCard
              key={card.key}
              tone={card.tone}
              label={card.label}
              value={card.value}
              hint={card.hint}
              icon={card.icon}
            />
          ))}
        </div>
      )}
    </>
  )
}
