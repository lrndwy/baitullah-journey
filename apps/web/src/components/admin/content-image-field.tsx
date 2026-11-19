'use client'

import { useEffect, useRef, useState } from 'react'
import { ImageIcon, UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { mediaUrl } from '@/lib/public-api'

/**
 * Shared file picker for CMS images (article thumbnail, testimonial photo).
 * The parent owns upload/clear timing — this only tracks the chosen file and
 * shows the current preview.
 */
export function ContentImageField({
  id,
  label,
  previewUrl,
  file,
  onFileChange,
  onClearPreview,
  disabled,
}: {
  id: string
  label: string
  previewUrl: string | null
  file: File | null
  onFileChange: (file: File | null) => void
  onClearPreview?: () => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setLocalPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const preview = localPreview ?? mediaUrl(previewUrl)

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={disabled}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon />
            {file || previewUrl ? 'Ganti' : 'Pilih file'}
          </Button>
          {(file || previewUrl) && onClearPreview ? (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                onFileChange(null)
                if (inputRef.current) inputRef.current.value = ''
                onClearPreview()
              }}
            >
              Hapus
            </Button>
          ) : null}
          <span className="truncate text-sm text-muted-foreground">
            {file
              ? file.name
              : previewUrl
                ? 'Gambar tersimpan'
                : 'PNG, JPEG, WebP, GIF · maks. 2 MB'}
          </span>
        </div>
      </div>
    </div>
  )
}
