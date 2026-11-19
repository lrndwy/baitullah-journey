'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon } from 'lucide-react'
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
import { ApiError } from '@/lib/api'
import { useBranding } from '@/components/branding-provider'
import { useSession } from '@/lib/session'

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useSession()
  const branding = useBranding()
  const [email, setEmail] = useState('admin@baitullahjourney.id')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await signIn(email, password)
      router.replace('/admin')
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Gagal masuk. Periksa email dan password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          {branding.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="mb-2 h-10 w-fit object-contain" />
          )}
          <CardTitle>Masuk ke {branding.siteName}</CardTitle>
          <CardDescription>Akses dashboard admin dengan email dan password.</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" />}
              {busy ? 'Masuk…' : 'Masuk'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex-col items-start gap-2 border-t text-xs text-muted-foreground">
          <Link href="/forgot-password" className="hover:underline">
            Lupa password?
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}
