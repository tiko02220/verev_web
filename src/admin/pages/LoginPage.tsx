import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { ApiError } from '../lib/apiClient'
import { Button, TextField } from '../components/ui/primitives'

export function LoginPage() {
  const { login, token } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  if (token) return <Navigate to="/admin" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorText(null)
    try {
      await login(email, password)
    } catch (error: unknown) {
      setErrorText(error instanceof ApiError ? error.message : 'Unable to sign in. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="admin-root flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-emerald-500 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full border border-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full border border-white/10" aria-hidden />
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-base font-bold backdrop-blur">1B</span>
          <span className="text-lg font-semibold">One Bonus</span>
        </div>
        <div className="relative">
          <h2 className="max-w-sm text-3xl font-semibold leading-tight">Run the whole network from one console.</h2>
          <p className="mt-3 max-w-sm text-sm text-white/80">Oversee every merchant, customer, and transaction across the platform — with full control to act in seconds.</p>
        </div>
        <p className="relative text-xs text-white/60">Platform operations · Authorized staff only</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm admin-rise">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
              <ShieldCheck className="size-6" aria-hidden />
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-subtle">Sign in to the platform operations console.</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@onebonus.am"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {errorText ? (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-100" role="alert">
                {errorText}
              </p>
            ) : null}
            <Button type="submit" isLoading={isSubmitting} className="mt-1 h-11 w-full">
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
