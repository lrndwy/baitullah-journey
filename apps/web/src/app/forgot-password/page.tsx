'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeftIcon, Loader2Icon, MailCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { ForgotPasswordResponse } from '@app/contracts'
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

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<ForgotPasswordResponse | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await apiFetch<ForgotPasswordResponse>('/api/auth/password/forgot', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setSent(result)

      // Mail is optional in development; when the API could not send it, the
      // code comes back so the flow stays testable end to end.
      if (result.devCode) {
        router.push(`/reset-password?email=${encodeURIComponent(email)}&code=${result.devCode}`)
      }
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Could not request a reset code')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            We will email a six-digit code. Enter it on the next screen with your new password.
          </CardDescription>
        </CardHeader>

        {sent ? (
          <>
            <CardContent className="flex flex-col items-start gap-3">
              <MailCheckIcon className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{sent.message}</p>
            </CardContent>
            <CardFooter className="flex-col gap-2 border-t">
              <Button asChild className="w-full" variant="outline">
                <Link href={`/reset-password?email=${encodeURIComponent(email)}`}>
                  I have the code
                </Link>
              </Button>
            </CardFooter>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3 border-t">
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2Icon className="animate-spin" />}
                Send reset code
              </Button>
              <Link
                href="/login"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
              >
                <ArrowLeftIcon className="size-3" />
                Back to sign in
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </main>
  )
}