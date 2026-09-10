import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { AstroCookies } from 'astro'

export const ACCESS_COOKIE = 'sb_access_token'
export const REFRESH_COOKIE = 'sb_refresh_token'

export type AuthUser = { id: string; email: string | null }

function supabaseEnv(): { url: string; key: string } {
  const url = import.meta.env.SUPABASE_URL
  const key = import.meta.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY belum diset di .env')
  }
  return { url, key }
}

export function getSupabase(): SupabaseClient {
  const { url, key } = supabaseEnv()
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

const cookieOptions = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax' as const,
  path: '/',
}

export function setSessionCookies(cookies: AstroCookies, session: Session): void {
  const expiresIn = Math.min(session.expires_in ?? 3600, 7 * 24 * 3600)
  cookies.set(ACCESS_COOKIE, session.access_token, { ...cookieOptions, maxAge: expiresIn })
  cookies.set(REFRESH_COOKIE, session.refresh_token, { ...cookieOptions, maxAge: 30 * 24 * 3600 })
}

export function clearAuthCookies(cookies: AstroCookies): void {
  cookies.set(ACCESS_COOKIE, '', { ...cookieOptions, maxAge: 0 })
  cookies.set(REFRESH_COOKIE, '', { ...cookieOptions, maxAge: 0 })
}

function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email ?? null }
}

export async function getSessionUser(cookies: AstroCookies): Promise<AuthUser | null> {
  const access = cookies.get(ACCESS_COOKIE)?.value
  const refresh = cookies.get(REFRESH_COOKIE)?.value
  if (!access) return null

  const sb = getSupabase()
  try {
    const { data, error } = await sb.auth.getUser(access)
    if (!error && data.user) return toAuthUser(data.user)
  } catch {
    // lanjut ke refresh di bawah
  }

  if (!refresh) return null
  try {
    const { data: refreshed, error: refreshError } = await sb.auth.refreshSession({ refresh_token: refresh })
    if (refreshError || !refreshed.session?.user) return null
    setSessionCookies(cookies, refreshed.session)
    return toAuthUser(refreshed.session.user)
  } catch {
    return null
  }
}