import { redirect } from 'next/navigation'

/** Google OAuth hand-off is removed; send leftover bookmarks to password login. */
export default function AuthCallbackPage() {
  redirect('/login')
}
