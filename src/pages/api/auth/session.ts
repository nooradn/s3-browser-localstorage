import type { APIRoute } from 'astro'
import { json } from '../../../lib/http'
import { getSessionUser } from '../../../lib/supabase'

export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies)
  return json({ user })
}