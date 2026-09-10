import type { APIRoute } from 'astro'
import { json } from '../../../lib/http'
import { HttpError } from '../../../lib/http'
import { wrap, clientFromRequest } from '../../../lib/s3req'
import { copyItem, moveItem } from '../../../lib/s3'

type Body = {
  bucket?: string
  sourceKey?: string
  targetKey?: string
  targetBucket?: string
  mode?: 'copy' | 'move'
  isFolder?: boolean
}

export const POST: APIRoute = wrap(async (request) => {
  const body = (await request.json().catch(() => null)) as Body | null
  const bucket = String(body?.bucket ?? '').trim()
  const sourceKey = String(body?.sourceKey ?? '').trim()
  const targetKey = String(body?.targetKey ?? '').trim()
  const targetBucket = String(body?.targetBucket ?? '').trim() || bucket
  const mode = body?.mode ?? 'copy'
  const isFolder = Boolean(body?.isFolder)

  if (!bucket || !sourceKey || !targetKey) {
    throw new HttpError(400, 'bucket, sourceKey, dan targetKey wajib diisi')
  }
  if (sourceKey === targetKey && bucket === targetBucket) {
    throw new HttpError(400, 'Source dan target tidak boleh sama')
  }
  if (mode !== 'copy' && mode !== 'move') {
    throw new HttpError(400, 'mode harus "copy" atau "move"')
  }

  const client = clientFromRequest(request)
  if (mode === 'move') {
    const moved = await moveItem(client, bucket, sourceKey, targetBucket, targetKey, isFolder)
    return json({ ok: true, moved })
  }
  const copied = await copyItem(client, bucket, sourceKey, targetBucket, targetKey, isFolder)
  return json({ ok: true, copied })
})