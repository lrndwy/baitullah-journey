'use client'

import { useState } from 'react'
import { Loader2Icon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type {
  Article,
  ArticleStatus,
  CreateArticleInput,
  UpdateArticleInput,
} from '@app/contracts'
import { ContentImageField } from '@/components/admin/content-image-field'
import { DataPagination } from '@/components/admin/data-pagination'
import { IconAction, Tip } from '@/components/admin/icon-action'
import { PageHeader } from '@/components/admin/page-header'
import { uploadImage } from '@/lib/image-upload'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, ApiError } from '@/lib/api'
import { usePaginated } from '@/lib/pagination'
import { useSession } from '@/lib/session'

const ALL_STATUSES = 'all'

const STATUS_VARIANT: Record<ArticleStatus, 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  published: 'secondary',
  archived: 'destructive',
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function ArticlesPage() {
  const { can } = useSession()
  const canWrite = can('content.write')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL_STATUSES)
  const [editing, setEditing] = useState<Article | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Article | null>(null)

  const list = usePaginated<Article>({
    path: '/api/content/articles',
    params: {
      q: search || undefined,
      status: status === ALL_STATUSES ? undefined : status,
    },
  })

  return (
    <>
      <PageHeader title="Artikel" description="Konten berita dan panduan untuk situs publik.">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-52 pl-8"
              placeholder="Cari artikel…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>Semua status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {canWrite && (
            <Tip content="Tulis artikel baru">
              <Button onClick={() => setEditing('new')}>
                <PlusIcon data-icon="inline-start" />
                Tambah artikel
              </Button>
            </Tip>
          )}
        </div>
      </PageHeader>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead>Dipublikasikan</TableHead>
              <TableHead className="w-[100px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 &&
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {list.items.map((article) => (
              <TableRow key={article.id}>
                <TableCell>
                  <div className="font-medium">{article.title}</div>
                  <code className="text-xs text-muted-foreground">{article.slug}</code>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[article.status]}>{article.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {article.publishedAt
                    ? new Date(article.publishedAt).toLocaleString('id-ID')
                    : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {canWrite && (
                    <>
                      <IconAction
                        label="Edit artikel"
                        icon={<PencilIcon />}
                        onClick={() => setEditing(article)}
                      />
                      <IconAction
                        label="Hapus artikel"
                        icon={<Trash2Icon />}
                        destructive
                        onClick={() => setDeleting(article)}
                      />
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!list.loading && list.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Belum ada artikel.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {list.error && <p className="text-sm text-destructive">{list.error}</p>}
      <DataPagination state={list} noun="artikel" />

      {editing !== null && (
        <ArticleFormDialog
          article={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            list.reload()
          }}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleting?.title}?</AlertDialogTitle>
            <AlertDialogDescription>Artikel akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return
                try {
                  await apiFetch(`/api/content/articles/${deleting.id}`, { method: 'DELETE' })
                  toast.success('Artikel dihapus')
                  setDeleting(null)
                  list.reload()
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Gagal menghapus')
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function emptyToNull(value: string) {
  return value.trim() === '' ? null : value.trim()
}

function ArticleFormDialog({
  article,
  onClose,
  onSaved,
}: {
  article: Article | null
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState(article?.title ?? '')
  const [slug, setSlug] = useState(article?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(article))
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '')
  const [content, setContent] = useState(article?.content ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(article?.thumbnailUrl ?? null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [clearThumbnail, setClearThumbnail] = useState(false)
  const [status, setStatus] = useState<ArticleStatus>(article?.status ?? 'draft')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            try {
              const payload: CreateArticleInput | UpdateArticleInput = {
                title: title.trim(),
                slug: slug.trim(),
                excerpt: emptyToNull(excerpt),
                content: emptyToNull(content),
                status,
                publishedAt:
                  status === 'published'
                    ? (article?.publishedAt ?? new Date().toISOString())
                    : null,
              }
              const saved = article
                ? (
                    await apiFetch<{ article: Article }>(`/api/content/articles/${article.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify(payload),
                    })
                  ).article
                : (
                    await apiFetch<{ article: Article }>('/api/content/articles', {
                      method: 'POST',
                      body: JSON.stringify(payload),
                    })
                  ).article

              if (clearThumbnail && !thumbnailFile) {
                await apiFetch(`/api/content/articles/${saved.id}/thumbnail`, { method: 'DELETE' })
              }
              if (thumbnailFile) {
                await uploadImage({
                  signPath: `/api/content/articles/${saved.id}/thumbnail/upload-url`,
                  completePath: `/api/content/articles/${saved.id}/thumbnail/complete`,
                  file: thumbnailFile,
                })
              }

              toast.success(article ? 'Artikel diperbarui' : 'Artikel dibuat')
              onSaved()
            } catch (cause) {
              toast.error(cause instanceof ApiError ? cause.message : 'Gagal menyimpan')
            } finally {
              setBusy(false)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{article ? 'Edit artikel' : 'Tambah artikel'}</DialogTitle>
            <DialogDescription>Konten bisa berupa HTML atau teks biasa.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="art-title">Judul</Label>
              <Input
                id="art-title"
                required
                maxLength={200}
                value={title}
                onChange={(event) => {
                  const next = event.target.value
                  setTitle(next)
                  if (!slugTouched) setSlug(slugify(next))
                }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="art-slug">Slug</Label>
                <Input
                  id="art-slug"
                  required
                  maxLength={200}
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true)
                    setSlug(event.target.value)
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as ArticleStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="art-excerpt">Ringkasan</Label>
              <Textarea
                id="art-excerpt"
                rows={2}
                maxLength={2000}
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="art-content">Konten</Label>
              <Textarea
                id="art-content"
                rows={10}
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </div>
            <ContentImageField
              id="art-thumb"
              label="Thumbnail"
              previewUrl={clearThumbnail ? null : thumbnailUrl}
              file={thumbnailFile}
              disabled={busy}
              onFileChange={(next) => {
                setThumbnailFile(next)
                if (next) setClearThumbnail(false)
              }}
              onClearPreview={() => {
                setThumbnailUrl(null)
                setClearThumbnail(true)
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
