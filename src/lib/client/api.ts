export type S3Item = {
  type: 'file' | 'folder'
  name: string
  key: string
  size?: number | null
  lastModified?: string | null
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function s3Headers(p: ProfileLike): Record<string, string> {
  return {
    'x-s3-endpoint': p.endpoint,
    'x-s3-region': p.region,
    'x-s3-access-key': p.accessKeyId,
    'x-s3-secret-key': p.secretAccessKey,
    'x-s3-force-path-style': String(p.forcePathStyle),
  }
}

type ProfileLike = {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

async function request<T>(url: string, p: ProfileLike, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...s3Headers(p), ...(init?.headers ?? {}) },
  })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // body bukan JSON
  }
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error ?? `HTTP ${res.status}`)
        : `HTTP ${res.status}`
    throw new ApiError(res.status, message)
  }
  return data as T
}

function jsonInit(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export async function listBuckets(p: ProfileLike): Promise<{ buckets: { name: string; createdAt: string | null }[] }> {
  return request('/api/s3/buckets', p)
}

export async function listObjects(
  p: ProfileLike,
  bucket: string,
  prefix = '',
): Promise<{ bucket: string; prefix: string; items: S3Item[] }> {
  const q = new URLSearchParams({ bucket, prefix })
  return request(`/api/s3/objects?${q.toString()}`, p)
}

export async function uploadFile(p: ProfileLike, bucket: string, key: string, file: File): Promise<{ ok: boolean }> {
  const fd = new FormData()
  fd.set('bucket', bucket)
  fd.set('key', key)
  fd.set('file', file)
  return request('/api/s3/upload', p, { method: 'POST', body: fd })
}

export async function deleteEntry(
  p: ProfileLike,
  bucket: string,
  key: string,
  isFolder: boolean,
): Promise<{ deleted: number }> {
  return request('/api/s3/delete', p, { ...jsonInit({ bucket, key, isFolder }), method: 'POST' })
}

export async function copyEntry(
  p: ProfileLike,
  bucket: string,
  sourceKey: string,
  targetKey: string,
  opts: { targetBucket?: string; isFolder?: boolean } = {},
): Promise<{ copied: number }> {
  return request(
    '/api/s3/copy',
    p,
    jsonInit({ bucket, sourceKey, targetKey, targetBucket: opts.targetBucket, mode: 'copy', isFolder: opts.isFolder }),
  )
}

export async function moveEntry(
  p: ProfileLike,
  bucket: string,
  sourceKey: string,
  targetKey: string,
  opts: { targetBucket?: string; isFolder?: boolean } = {},
): Promise<{ moved: number }> {
  return request(
    '/api/s3/copy',
    p,
    jsonInit({ bucket, sourceKey, targetKey, targetBucket: opts.targetBucket, mode: 'move', isFolder: opts.isFolder }),
  )
}

export async function makeFolderApi(p: ProfileLike, bucket: string, key: string): Promise<{ key: string }> {
  return request('/api/s3/mkdir', p, jsonInit({ bucket, key }))
}

export async function downloadBlob(
  p: ProfileLike,
  bucket: string,
  key: string,
  preview = false,
): Promise<{ blob: Blob; contentType: string | null }> {
  const q = new URLSearchParams({ bucket, key })
  if (preview) q.set('preview', '1')
  const res = await fetch(`/api/s3/download?${q.toString()}`, { headers: s3Headers(p) })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const d = (await res.json()) as { error?: string }
      if (d?.error) message = d.error
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message)
  }
  return { blob: await res.blob(), contentType: res.headers.get('content-type') }
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}