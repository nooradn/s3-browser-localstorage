import type { APIRoute } from 'astro'
import { HttpError, json, jsonError } from '../../../../lib/http'
import { supabaseWithSession } from '../../../../lib/supabase'

export const POST: APIRoute = async (ctx) => {
  const body = (await ctx.request.json().catch(() => null)) as { id?: unknown } | null
  const uid = ctx.locals.user?.id
  if (!uid) return jsonError(401, 'Sesi tidak valid')

  const targetId = body && typeof body.id === 'string' ? body.id.trim() : null
  if (targetId === null && body && typeof body.id === 'string') {
    throw new HttpError(400, 'id tidak valid')
  }

  const sb = supabaseWithSession(ctx.cookies)

  const { error: resetError } = await sb
    .from('s3_profiles')
    .update({ is_active: false })
    .eq('user_id', uid)
  if (resetError) return jsonError(400, resetError.message)

  let activated = false
  if (targetId) {
    const { error: setError } = await sb
      .from('s3_profiles')
      .update({ is_active: true })
      .eq('id', targetId)
      .eq('user_id', uid)
    if (setError) return jsonError(400, setError.message)
    activated = true
  }

  return json({ ok: true, activeId: targetId, activated })
}