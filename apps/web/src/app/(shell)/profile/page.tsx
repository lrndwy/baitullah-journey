'use client'

import { useEffect, useState } from 'react'
import { Loader2Icon, SaveIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { ChangePasswordInput, UpdateProfileInput, UserProfile } from '@app/contracts'
import { AvatarCard, AvatarCardSkeleton } from '@/components/admin/avatar-card'
import { PageHeader } from '@/components/admin/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, ApiError } from '@/lib/api'
import { fetchPasswordPolicy, type PasswordPolicySummary } from '@/lib/password-policy'
import { PasswordPolicyChecklist } from '@/components/password-policy-checklist'
import { useSession } from '@/lib/session'

/** The editable shape, kept as strings so an empty input clears the field. */
interface ProfileForm {
  jobTitle: string
  department: string
  phone: string
  location: string
  timezone: string
  locale: string
  bio: string
}

const EMPTY_FORM: ProfileForm = {
  jobTitle: '',
  department: '',
  phone: '',
  location: '',
  timezone: '',
  locale: '',
  bio: '',
}

export default function ProfilePage() {
  const { user } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void apiFetch<{ profile: UserProfile }>('/api/profile/me')
      .then(({ profile: loaded }) => {
        setProfile(loaded)
        setForm({
          jobTitle: loaded.jobTitle ?? '',
          department: loaded.department ?? '',
          phone: loaded.phone ?? '',
          location: loaded.location ?? '',
          timezone: loaded.timezone ?? '',
          locale: loaded.locale ?? '',
          bio: loaded.bio ?? '',
        })
      })
      .catch(() => toast.error('Could not load your profile'))
  }, [])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      // Empty strings are sent as `null`, which is what clears a field. Sending
      // `undefined` would leave the stored value untouched.
      const payload: UpdateProfileInput = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value.trim() === '' ? null : value.trim()]),
      ) as UpdateProfileInput

      const { profile: updated } = await apiFetch<{ profile: UserProfile }>('/api/profile/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setProfile(updated)
      toast.success('Profile saved')
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not save your profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Your profile"
        description="This is your own record. Editing it needs no permission beyond being signed in."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-6">
          {profile === null ? (
            <AvatarCardSkeleton />
          ) : (
            <AvatarCard profile={profile} onChange={setProfile} canEdit />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Row label="Email" value={profile?.email} />
              <Row label="Department" value={profile?.department} />
              <Row label="Location" value={profile?.location} />
              <Row label="Timezone" value={profile?.timezone} />
              <Separator />
              <div className="flex flex-wrap gap-1.5">
                {(profile?.roles ?? user?.roles ?? []).map((role) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {user?.permissions.length ?? 0} permissions granted through those roles
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <form onSubmit={onSubmit}>
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>
                  Clearing a field removes the stored value rather than saving an empty string.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 sm:grid-cols-2 pt-4">
                {profile === null
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))
                  : (
                      <>
                        <Field
                          id="jobTitle"
                          label="Job title"
                          value={form.jobTitle}
                          onChange={(value) => setForm({ ...form, jobTitle: value })}
                        />
                        <Field
                          id="department"
                          label="Department"
                          value={form.department}
                          onChange={(value) => setForm({ ...form, department: value })}
                        />
                        <Field
                          id="phone"
                          label="Phone"
                          value={form.phone}
                          onChange={(value) => setForm({ ...form, phone: value })}
                        />
                        <Field
                          id="location"
                          label="Location"
                          value={form.location}
                          onChange={(value) => setForm({ ...form, location: value })}
                        />
                        <Field
                          id="timezone"
                          label="Timezone"
                          placeholder="Asia/Jakarta"
                          value={form.timezone}
                          onChange={(value) => setForm({ ...form, timezone: value })}
                        />
                        <Field
                          id="locale"
                          label="Locale"
                          placeholder="id-ID"
                          value={form.locale}
                          onChange={(value) => setForm({ ...form, locale: value })}
                        />

                        <div className="flex flex-col gap-2 sm:col-span-2 pb-6">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            rows={3}
                            value={form.bio}
                            onChange={(event) => setForm({ ...form, bio: event.target.value })}
                          />
                        </div>
                      </>
                    )}
              </CardContent>

              <CardFooter className="border-t">
                <Button type="submit" disabled={saving || profile === null}>
                  {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                  Save profile
                </Button>
              </CardFooter>
            </form>
          </Card>

          <ChangePasswordCard />
        </div>
      </div>
    </>
  )
}

function ChangePasswordCard() {
  const session = useSession()
  const [form, setForm] = useState<ChangePasswordInput>({ currentPassword: '', newPassword: '' })
  const [busy, setBusy] = useState(false)
  const [policy, setPolicy] = useState<PasswordPolicySummary | null>(null)

  useEffect(() => {
    let active = true
    void fetchPasswordPolicy().then((next) => {
      if (active) setPolicy(next)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Card>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          try {
            await apiFetch('/api/auth/password/change', {
              method: 'POST',
              body: JSON.stringify(form),
            })
            setForm({ currentPassword: '', newPassword: '' })
            toast.success('Password changed. Other sessions were signed out.')
          } catch (cause) {
            toast.error(cause instanceof ApiError ? cause.message : 'Could not change the password')
          } finally {
            setBusy(false)
          }
        }}
      >
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Changing your password signs out every other session, including this one on refresh.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 pb-5 pt-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              required
              minLength={policy?.minLength ?? 12}
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
            />
            {policy && (
              <PasswordPolicyChecklist
                password={form.newPassword}
                policy={policy}
                email={session.user?.email}
                name={session.user?.name}
              />
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" variant="outline" disabled={busy}>
            {busy && <Loader2Icon className="animate-spin" />}
            Change password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value || '—'}</span>
    </div>
  )
}
