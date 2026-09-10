import type { APIRoute } from 'astro'
import { json, jsonError } from '../../../lib/http'
import { getSupabase, setSessionCookies } from '../../../lib/supabase'

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')

  if (!email || !password) return jsonError(400, 'Email dan password wajib diisi')

  const sb = getSupabase()
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    const message =
      error?.message === 'Invalid login credentials'
        ? 'Email atau password salah'
        : (error?.message ?? 'Gagal login')
    return jsonError(401, message)
  }

  setSessionCookies(cookies, data.session)
  return json({ ok: true, user: { id: data.user.id, email: data.user.email } })
}