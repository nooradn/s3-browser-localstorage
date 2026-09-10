import type { APIRoute } from 'astro'
import { json } from '../../../lib/http'
import { HttpError } from '../../../lib/http'
import { wrap, clientFromRequest } from '../../../lib/s3req'
import { makeFolderObject } from '../../../lib/s3'

type Body = { bucket?: string; key?: string }

export const POST: APIRoute = wrap(async (request) => {
  const body = (await request.json().catch(() => null)) as Body | null
  const bucket = String(body?.bucket ?? '').trim()
  let key = String(body?.key ?? '').trim()
  if (!bucket || !key) throw new HttpError(400, 'bucket dan key wajib diisi')

  const folderBase = key.endsWith('/') ? key.slice(0, -1) : key
  const segments = folderBase.split('/').filter(Boolean)
  const name = segments.at(-1) ?? ''
  if (!name || /[/\\]/.test(name) || name === '.' || name === '..') {
    throw new HttpError(400, 'Nama folder tidak valid')
  }

  const client = clientFromRequest(request)
  const folderKey = `${folderBase}/`
  await makeFolderObject(client, bucket, folderKey)
  return json({ ok: true, key: folderKey })
})