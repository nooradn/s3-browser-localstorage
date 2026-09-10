import type { APIRoute } from 'astro'
import { json } from '../../../lib/http'
import { HttpError } from '../../../lib/http'
import { wrap, clientFromRequest } from '../../../lib/s3req'
import { listObjects } from '../../../lib/s3'

export const GET: APIRoute = wrap(async (request) => {
  const url = new URL(request.url)
  const bucket = url.searchParams.get('bucket')?.trim()
  const prefix = url.searchParams.get('prefix') ?? ''
  if (!bucket) throw new HttpError(400, 'Param bucket wajib diisi')

  const client = clientFromRequest(request)
  const items = await listObjects(client, bucket, prefix)
  return json({ bucket, prefix, items })
})