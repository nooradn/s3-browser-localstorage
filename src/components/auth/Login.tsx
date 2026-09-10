import { useEffect, useState } from 'preact/hooks'
import { CloudIcon, SpinnerIcon } from '../s3/Icons'
import ThemeToggle from '../ThemeToggle'

type Props = { redirectTo?: string }

export default function Login({ redirectTo }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/auth/session', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { user?: unknown }) => {
        if (d?.user) window.location.replace('/app')
      })
      .catch(() => undefined)
    return () => ctrl.abort()
  }, [])

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(data?.error ?? 'Gagal login')
      const target = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/app'
      window.location.href = target
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setLoading(false)
    }
  }

  return (
    <div class="login-wrap">
      <ThemeToggle className="login-theme-toggle" />
      <form class="login-card" onSubmit={submit}>
        <div class="login-logo">
          <span class="login-logo-icon">
            <CloudIcon size={30} />
          </span>
        </div>
        <h1 class="login-title">S3 Browser</h1>
        <p class="login-sub">Kelola object di S3-compatible storage dari satu tempat.</p>

        <div class="field">
          <span class="label">Email</span>
          <input
            class="input"
            type="email"
            required
            autocomplete="username"
            placeholder="kamu@contoh.com"
            value={email}
            onInput={(e) => setEmail(e.currentTarget.value)}
          />
        </div>
        <div class="field">
          <span class="label">Password</span>
          <input
            class="input"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
          />
        </div>

        {error ? <p class="auth-err">{error}</p> : null}

        <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
          {loading ? (
            <>
              <SpinnerIcon className="spin" size={16} /> Memeriksa...
            </>
          ) : (
            'Masuk'
          )}
        </button>

        <p class="login-foot">Login menggunakan akun Supabase project ini.</p>
      </form>
    </div>
  )
}