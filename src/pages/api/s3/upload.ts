import type { APIRoute } from 'astro'
import { json } from '../../../lib/http'
import { HttpError } from '../../../lib/http'
import { wrap, clientFromRequest } from '../../../lib/s3req'
import { putObject } from '../../../lib/s3'

export const POST: APIRoute = wrap(async (request) => {
  const client = clientFromRequest(request)

  const form = await request.formData().catch(() => null)
  if (!form) throw new HttpError(400, 'Form tidak valid')

  const bucket = String(form.get('bucket') ?? '').trim()
  const key = String(form.get('key') ?? '')
  const file = form.get('file')

  if (!bucket) throw new HttpError(400, 'Bucket wajib diisi')
  if (!key) throw new HttpError(400, 'Key wajib diisi')
  if (!(file instanceof File)) throw new HttpError(400, 'File belum dipilih')

  const bytes = new Uint8Array(await file.arrayBuffer())
  await putObject(client, bucket, key, {
    data: bytes,
    size: bytes.byteLength,
    type: file.type,
  })

  return json({ ok: true, key, size: file.size })
})