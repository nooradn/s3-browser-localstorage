import type { APIContext, APIRoute } from 'astro'
import type { S3Client } from '@aws-sdk/client-s3'
import { HttpError, jsonError } from './http'
import { makeClient, s3StatusAndMessage, type S3Creds } from './s3'

export function credsFromRequest(request: Request): S3Creds | null {
  const endpoint = request.headers.get('x-s3-endpoint')
  const region = request.headers.get('x-s3-region') ?? 'auto'
  const accessKeyId = request.headers.get('x-s3-access-key')
  const secretAccessKey = request.headers.get('x-s3-secret-key')
  const forcePathStyle = request.headers.get('x-s3-force-path-style') === 'true'
  if (!endpoint?.trim() || !accessKeyId?.trim() || !secretAccessKey?.trim()) return null
  return { endpoint, region, accessKeyId, secretAccessKey, forcePathStyle }
}

export function clientFromRequest(request: Request): S3Client {
  const creds = credsFromRequest(request)
  if (!creds) {
    throw new HttpError(400, 'Kredensial S3 tidak lengkap (endpoint / access key / secret key)')
  }
  return makeClient(creds)
}

export function wrap(fn: (request: Request, ctx: APIContext) => Promise<Response>): APIRoute {
  return async (ctx) => {
    try {
      return await fn(ctx.request, ctx)
    } catch (e) {
      if (e instanceof HttpError) return jsonError(e.status, e.message)
      const { status, message } = s3StatusAndMessage(e)
      return jsonError(status, message)
    }
  }
}