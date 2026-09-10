import type { APIRoute } from 'astro'
import { HttpError } from '../../../lib/http'
import { wrap, clientFromRequest } from '../../../lib/s3req'
import { getObjectStream, guessContentType } from '../../../lib/s3'

export const GET: APIRoute = wrap(async (request) => {
  const url = new URL(request.url)
  const bucket = url.searchParams.get('bucket')?.trim()
  const key = url.searchParams.get('key') ?? ''
  const preview = url.searchParams.get('preview') === '1'

  if (!bucket) throw new HttpError(400, 'Param bucket wajib diisi')
  if (!key) throw new HttpError(400, 'Param key wajib diisi')

  const client = clientFromRequest(request)
  const obj = await getObjectStream(client, bucket, key)

  const name = key.split('/').pop() || 'download'
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')

  const headers = new Headers({ 'Cache-Control': 'no-store' })
  headers.set('Content-Type', guessContentType(obj.contentType, key))
  if (obj.contentLength != null) headers.set('Content-Length', String(obj.contentLength))
  const disposition = preview ? 'inline' : 'attachment'
  headers.set('Content-Disposition', `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`)
  if (obj.lastModified) headers.set('Last-Modified', obj.lastModified)

  return new Response(obj.body, { headers })
})