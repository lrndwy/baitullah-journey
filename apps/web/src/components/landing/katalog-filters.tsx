'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Category } from '@app/contracts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { brandBtn, brandField } from '@/components/landing/brand'

const ALL_CATEGORIES = '__all__'

type Props = {
  categories: Category[]
  initialQ?: string
  initialCategorySlug?: string
}

export function KatalogFilters({ categories, initialQ = '', initialCategorySlug }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(initialQ)
  const [category, setCategory] = useState(initialCategorySlug || ALL_CATEGORIES)

  function apply(event: React.FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    const query = q.trim()
    if (query) params.set('q', query)
    if (category && category !== ALL_CATEGORIES) params.set('kategori', category)
    const qs = params.toString()
    router.push(qs ? `/katalog?${qs}` : '/katalog')
  }

  return (
    <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={apply}>
      <div className="flex flex-1 flex-col gap-1.5 text-sm">
        <Label htmlFor="katalog-q">Cari paket</Label>
        <Input
          id="katalog-q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Nama atau kata kunci"
          className={brandField}
        />
      </div>
      <div className="flex w-full flex-col gap-1.5 text-sm sm:w-56">
        <Label htmlFor="katalog-kategori">Kategori</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="katalog-kategori" className={`w-full ${brandField}`}>
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Semua kategori</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item.id} value={item.slug}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className={brandBtn.primary}>
        Terapkan
      </Button>
    </form>
  )
}
