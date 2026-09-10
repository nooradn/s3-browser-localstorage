import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'

export type S3Creds = {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

export type S3Folder = { type: 'folder'; name: string; key: string }
export type S3File = {
  type: 'file'
  name: string
  key: string
  size: number
  lastModified: string | null
  etag: string | null
}
export type S3Item = S3Folder | S3File

export type BucketInfo = { name: string; createdAt: string | null }

export type UploadSource = {
  data: Uint8Array
  size: number
  type: string
}

export function normalizeEndpoint(endpoint: string): string {
  let e = endpoint.trim()
  if (!e) return e
  if (!/^[a-z]+:\/\//i.test(e)) e = `https://${e}`
  return e.replace(/\/+$/, '')
}

export function makeClient(c: S3Creds): S3Client {
  return new S3Client({
    endpoint: normalizeEndpoint(c.endpoint),
    region: c.region?.trim() || 'auto',
    forcePathStyle: Boolean(c.forcePathStyle),
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
    },
  })
}

export async function listBuckets(client: S3Client): Promise<BucketInfo[]> {
  const out = await client.send(new ListBucketsCommand({}))
  const buckets: BucketInfo[] = []
  for (const b of out.Buckets ?? []) {
    if (!b.Name) continue
    buckets.push({ name: b.Name, createdAt: b.CreationDate?.toISOString() ?? null })
  }
  return buckets
}

function nameFromKey(key: string, prefix: string): string {
  const rest = prefix ? key.slice(prefix.length) : key
  const clean = rest.replace(/\/+$/, '')
  const idx = clean.lastIndexOf('/')
  return idx >= 0 ? clean.slice(idx + 1) : clean
}

export async function listObjects(client: S3Client, bucket: string, prefix: string): Promise<S3Item[]> {
  const out = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || undefined,
      Delimiter: '/',
      MaxKeys: 1000,
    }),
  )

  const items: S3Item[] = []
  const seen = new Set<string>()

  for (const cp of out.CommonPrefixes ?? []) {
    const key = cp.Prefix ?? ''
    if (!key) continue
    seen.add(key)
    items.push({ type: 'folder', name: nameFromKey(key, prefix), key })
  }

  for (const c of out.Contents ?? []) {
    const key = c.Key ?? ''
    if (key === prefix) continue
    if (key.endsWith('/')) {
      const name = nameFromKey(key, prefix)
      if (name && !seen.has(key)) items.push({ type: 'folder', name, key })
    } else if (!seen.has(key)) {
      items.push({
        type: 'file',
        name: nameFromKey(key, prefix),
        key,
        size: c.Size ?? 0,
        lastModified: c.LastModified?.toISOString() ?? null,
        etag: c.ETag ?? null,
      })
    }
  }

  const order: Record<S3Item['type'], number> = { folder: 0, file: 1 }
  items.sort(
    (a, b) =>
      order[a.type] - order[b.type] ||
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
  )
  return items
}

export async function putObject(
  client: S3Client,
  bucket: string,
  key: string,
  source: UploadSource,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: source.data,
      ContentType: source.type || undefined,
      ContentLength: source.size,
    }),
  )
}

export async function makeFolderObject(client: S3Client, bucket: string, key: string): Promise<void> {
  const folderKey = key.endsWith('/') ? key : `${key}/`
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: folderKey,
      Body: new Uint8Array(0),
      ContentLength: 0,
    }),
  )
}

export type DownloadResult = {
  body: ReadableStream<Uint8Array>
  contentType: string | null
  contentLength: number | null
  lastModified: string | null
}

export async function getObjectStream(client: S3Client, bucket: string, key: string): Promise<DownloadResult> {
  const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const nodeBody = out.Body as unknown as Readable | undefined
  if (!nodeBody) throw new Error('Object tidak memiliki isi')
  return {
    body: Readable.toWeb(nodeBody) as ReadableStream<Uint8Array>,
    contentType: out.ContentType ?? null,
    contentLength: out.ContentLength ?? null,
    lastModified: out.LastModified?.toISOString() ?? null,
  }
}

async function listAllKeys(client: S3Client, bucket: string, prefix: string): Promise<string[]> {
  const keys: string[] = []
  let token: string | undefined
  do {
    const out = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    )
    for (const c of out.Contents ?? []) if (c.Key) keys.push(c.Key)
    token = out.IsTruncated ? out.NextContinuationToken : undefined
  } while (token)
  return keys
}

export async function deleteObject(client: S3Client, bucket: string, key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

export async function deletePrefix(client: S3Client, bucket: string, prefix: string): Promise<number> {
  const keys = await listAllKeys(client, bucket, prefix)
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000)
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((k) => ({ Key: k })), Quiet: true },
      }),
    )
  }
  return keys.length
}

function copySource(bucket: string, key: string): string {
  return `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`
}

export async function copyObject(
  client: S3Client,
  srcBucket: string,
  srcKey: string,
  dstBucket: string,
  dstKey: string,
): Promise<void> {
  await client.send(
    new CopyObjectCommand({
      Bucket: dstBucket,
      Key: dstKey,
      CopySource: copySource(srcBucket, srcKey),
    }),
  )
}

async function copyPrefix(
  client: S3Client,
  srcBucket: string,
  srcPrefix: string,
  dstBucket: string,
  dstPrefix: string,
): Promise<number> {
  const keys = await listAllKeys(client, srcBucket, srcPrefix)
  for (const key of keys) {
    const dstKey = dstPrefix + key.slice(srcPrefix.length)
    await copyObject(client, srcBucket, key, dstBucket, dstKey)
  }
  return keys.length
}

export async function copyItem(
  client: S3Client,
  srcBucket: string,
  srcKey: string,
  dstBucket: string,
  dstKey: string,
  isFolder: boolean,
): Promise<number> {
  if (!isFolder) {
    await copyObject(client, srcBucket, srcKey, dstBucket, dstKey)
    return 1
  }
  const srcPrefix = srcKey.endsWith('/') ? srcKey : `${srcKey}/`
  const dstPrefix = dstKey.endsWith('/') ? dstKey : `${dstKey}/`
  try {
    await copyObject(client, srcBucket, srcPrefix, dstBucket, dstPrefix)
  } catch {
    // placeholder folder boleh tidak ada
  }
  return copyPrefix(client, srcBucket, srcPrefix, dstBucket, dstPrefix)
}

export async function moveItem(
  client: S3Client,
  srcBucket: string,
  srcKey: string,
  dstBucket: string,
  dstKey: string,
  isFolder: boolean,
): Promise<number> {
  const n = await copyItem(client, srcBucket, srcKey, dstBucket, dstKey, isFolder)
  if (isFolder) {
    await deletePrefix(client, srcBucket, srcKey.endsWith('/') ? srcKey : `${srcKey}/`)
  } else {
    await deleteObject(client, srcBucket, srcKey)
  }
  return n
}

export function s3StatusAndMessage(err: unknown): { status: number; message: string } {
  if (err && typeof err === 'object') {
    const e = err as { $metadata?: { httpStatusCode?: number }; name?: string; message?: string }
    const status = e.$metadata?.httpStatusCode
    if (typeof status === 'number' && status >= 400 && status < 600) {
      return { status, message: e.message ?? `S3 error ${status}` }
    }
  }
  if (err instanceof Error) return { status: 400, message: err.message }
  return { status: 500, message: String(err) }
}

const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  json: 'application/json',
  xml: 'application/xml',
  csv: 'text/csv; charset=utf-8',
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  pdf: 'application/pdf',
  zip: 'application/zip',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  tar: 'application/x-tar',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  js: 'text/javascript',
  mjs: 'text/javascript',
  ts: 'text/x-typescript',
  tsx: 'text/x-typescript',
  css: 'text/css',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

export function guessContentType(existing: string | null, key: string): string {
  if (existing) return existing
  const ext = key.toLowerCase().split('.').pop() ?? ''
  return EXT_MIME[ext] ?? 'application/octet-stream'
}