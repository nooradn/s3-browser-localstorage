import type { APIRoute } from 'astro'
import { json } from '../../../lib/http'
import { clearAuthCookies } from '../../../lib/supabase'

export const POST: APIRoute = async ({ cookies }) => {
  clearAuthCookies(cookies)
  return json({ ok: true })
}