import type { APIRoute } from 'astro'
import { json } from '../../../lib/http'
import { HttpError } from '../../../lib/http'
import { wrap, clientFromRequest } from '../../../lib/s3req'
import { deleteObject, deletePrefix } from '../../../lib/s3'

type Body = { bucket?: string; key?: string; isFolder?: boolean }

export const POST: APIRoute = wrap(async (request) => {
  const body = (await request.json().catch(() => null)) as Body | null
  const bucket = String(body?.bucket ?? '').trim()
  const key = String(body?.key ?? '')
  if (!bucket || !key) throw new HttpError(400, 'bucket dan key wajib diisi')

  const client = clientFromRequest(request)
  let deleted: number
  if (body?.isFolder) {
    const prefix = key.endsWith('/') ? key : `${key}/`
    deleted = await deletePrefix(client, bucket, prefix)
  } else {
    await deleteObject(client, bucket, key)
    deleted = 1
  }
  return json({ ok: true, deleted })
})