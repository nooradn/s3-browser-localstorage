import type { APIRoute } from 'astro'
import { HttpError, json, jsonError } from '../../../lib/http'
import { supabaseWithSession } from '../../../lib/supabase'

type Row = {
  id: string
  user_id: string
  name: string
  endpoint: string
  region: string
  access_key_id: string
  secret_access_key: string
  force_path_style: boolean
  is_active: boolean
}

export type ProfileDto = {
  id: string
  name: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
  isActive: boolean
}

function toDto(row: Row): ProfileDto {
  return {
    id: row.id,
    name: row.name,
    endpoint: row.endpoint,
    region: row.region,
    accessKeyId: row.access_key_id,
    secretAccessKey: row.secret_access_key,
    forcePathStyle: row.force_path_style,
    isActive: row.is_active,
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') throw new HttpError(400, 'Body JSON tidak valid')
  return body
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function validateFields(body: Record<string, unknown>): {
  name: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
} {
  const name = str(body.name)
  const endpoint = str(body.endpoint)
  const region = str(body.region) || 'auto'
  const accessKeyId = str(body.accessKeyId)
  const secretAccessKey = str(body.secretAccessKey)
  const forcePathStyle = body.forcePathStyle !== false

  if (!name) throw new HttpError(400, 'Nama profil wajib diisi')
  if (!endpoint) throw new HttpError(400, 'Endpoint S3 wajib diisi')
  if (!accessKeyId) throw new HttpError(400, 'Access Key wajib diisi')
  if (!secretAccessKey) throw new HttpError(400, 'Secret Key wajib diisi')

  return { name, endpoint, region, accessKeyId, secretAccessKey, forcePathStyle }
}

export const GET: APIRoute = async (ctx) => {
  const sb = supabaseWithSession(ctx.cookies)
  const { data, error } = await sb
    .from('s3_profiles')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return jsonError(400, error.message)

  const rows = (data ?? []) as Row[]
  return json({
    profiles: rows.map(toDto),
    activeId: rows.find((r) => r.is_active)?.id ?? null,
  })
}

export const POST: APIRoute = async (ctx) => {
  const body = await readBody(ctx.request)
  const fields = validateFields(body)
  const uid = ctx.locals.user?.id
  if (!uid) return jsonError(401, 'Sesi tidak valid')

  const sb = supabaseWithSession(ctx.cookies)
  const { data, error } = await sb
    .from('s3_profiles')
    .insert({
      user_id: uid,
      name: fields.name,
      endpoint: fields.endpoint,
      region: fields.region,
      access_key_id: fields.accessKeyId,
      secret_access_key: fields.secretAccessKey,
      force_path_style: fields.forcePathStyle,
    })
    .select()
    .single()
  if (error || !data) return jsonError(400, error?.message ?? 'Gagal menyimpan profil')

  return json({ profile: toDto(data as Row) }, 201)
}

export const PATCH: APIRoute = async (ctx) => {
  const body = await readBody(ctx.request)
  const id = str(body.id)
  if (!id) throw new HttpError(400, 'id wajib diisi')
  const fields = validateFields(body)

  const sb = supabaseWithSession(ctx.cookies)
  const { data, error } = await sb
    .from('s3_profiles')
    .update({
      name: fields.name,
      endpoint: fields.endpoint,
      region: fields.region,
      access_key_id: fields.accessKeyId,
      secret_access_key: fields.secretAccessKey,
      force_path_style: fields.forcePathStyle,
    })
    .eq('id', id)
    .select()
    .single()
  if (error || !data) return jsonError(400, error?.message ?? 'Profil tidak ditemukan')

  return json({ profile: toDto(data as Row) })
}

export const DELETE: APIRoute = async (ctx) => {
  const url = new URL(ctx.request.url)
  const id = url.searchParams.get('id') ?? ''
  if (!id) throw new HttpError(400, 'id wajib diisi')

  const sb = supabaseWithSession(ctx.cookies)
  const { error } = await sb.from('s3_profiles').delete().eq('id', id)
  if (error) return jsonError(400, error.message)

  return json({ ok: true })
}