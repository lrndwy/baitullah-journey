'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
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
import { apiFetch, ApiError } from '@/lib/api'
import { fetchPasswordPolicy, type PasswordPolicySummary } from '@/lib/password-policy'
import { PasswordPolicyChecklist } from '@/components/password-policy-checklist'

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [code, setCode] = useState(params.get('code') ?? '')
  const [newPassword, setNewPassword] = useState('')
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

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await apiFetch('/api/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword }),
      })
      toast.success('Password updated. Every session was signed out.')
      router.replace('/login')
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not reset the password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Enter your reset code</CardTitle>
        <CardDescription>
          The code expires shortly, and resetting signs out every existing session.
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Six-digit code</Label>
            <Input
              id="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="000000"
              className="font-mono tracking-[0.4em]"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
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
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            {policy ? (
              <PasswordPolicyChecklist password={newPassword} policy={policy} email={email} />
            ) : (
              <p className="text-xs text-muted-foreground">At least 12 characters.</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3 border-t">
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2Icon className="animate-spin" />}
            Set new password
          </Button>
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">
            Request a new code
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <Suspense
        fallback={
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Enter your reset code</CardTitle>
            </CardHeader>
          </Card>
        }
      >
        <ResetForm />
      </Suspense>
    </main>
  )
}