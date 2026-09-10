import type { APIRoute } from 'astro'
import { json } from '../../../lib/http'
import { wrap, clientFromRequest } from '../../../lib/s3req'
import { listBuckets } from '../../../lib/s3'

export const GET: APIRoute = wrap(async (request) => {
  const client = clientFromRequest(request)
  const buckets = await listBuckets(client)
  return json({ buckets })
})