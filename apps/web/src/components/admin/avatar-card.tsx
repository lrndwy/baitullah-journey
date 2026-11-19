'use client'

import { useRef, useState } from 'react'
import { ImagePlusIcon, Loader2Icon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { UserProfile } from '@app/contracts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch, ApiError } from '@/lib/api'
import { uploadImage } from '@/lib/image-upload'
import { useSession } from '@/lib/session'

/**
 * The avatar uploader. The image itself is served as a short-lived presigned
 * URL that the API regenerates on every read, so a stale URL can never be
 * cached into the page.
 */
export function AvatarCard({
  profile,
  onChange,
  canEdit,
}: {
  profile: UserProfile
  onChange: (profile: UserProfile) => void
  canEdit: boolean
}) {
  const { refreshUser } = useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    setBusy(true)
    try {
      const result = await uploadImage({
        signPath: '/api/profile/me/avatar/upload-url',
        completePath: '/api/profile/me/avatar/complete',
        file,
      })
      onChange((result as { profile: UserProfile }).profile)
      // The sidebar renders the session user, so it has to be told too.
      await refreshUser()
      toast.success('Photo updated')
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not upload the photo')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Card className="h-fit">
      {/* `justify-items-center`, not `items-center`: the header is a grid, so
          the avatar is only centred horizontally once the grid item is allowed
          to shrink to its content. */}
      <CardHeader className="justify-items-center text-center">
        <div className="relative">
          <Avatar className="size-24">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.email} />}
            <AvatarFallback className="text-2xl">
              {profile.email.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          )}
        </div>

        <CardTitle className="text-base">{profile.name ?? profile.email}</CardTitle>
        <CardDescription>{profile.jobTitle ?? 'No job title set'}</CardDescription>
      </CardHeader>

      {canEdit && (
        <CardContent className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />
          <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            <ImagePlusIcon />
            {profile.avatarUrl ? 'Change photo' : 'Add photo'}
          </Button>

          {profile.avatarUrl && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const result = await apiFetch<{ profile: UserProfile }>(
                    '/api/profile/me/avatar',
                    { method: 'DELETE' },
                  )
                  onChange(result.profile)
                  await refreshUser()
                  toast.success('Photo removed')
                } catch (cause) {
                  toast.error(cause instanceof ApiError ? cause.message : 'Could not remove it')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Trash2Icon />
              Remove
            </Button>
          )}

          <p className="text-center text-xs text-muted-foreground">
            PNG, JPEG, WebP, GIF or ICO up to 2 MB. The file is checked by its actual bytes, not its
            extension.
          </p>
        </CardContent>
      )}
    </Card>
  )
}

/** Shown while the profile is still loading. */
export function AvatarCardSkeleton() {
  return (
    <Card className="h-fit">
      <CardHeader className="justify-items-center">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="mt-2 h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  )
}
