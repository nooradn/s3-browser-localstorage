import { ApiError } from './api'

export type S3Profile = {
  id: string
  name: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

export type ProfileInput = Omit<S3Profile, 'id'>

type ProfileDto = {
  id: string
  name: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
  isActive: boolean
}

function fromDto(d: ProfileDto): S3Profile {
  return {
    id: d.id,
    name: d.name,
    endpoint: d.endpoint,
    region: d.region,
    accessKeyId: d.accessKeyId,
    secretAccessKey: d.secretAccessKey,
    forcePathStyle: d.forcePathStyle,
  }
}

function toPayload(input: ProfileInput): Record<string, unknown> {
  return {
    name: input.name,
    endpoint: input.endpoint,
    region: input.region,
    accessKeyId: input.accessKeyId,
    secretAccessKey: input.secretAccessKey,
    forcePathStyle: input.forcePathStyle,
  }
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
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

export async function fetchProfiles(): Promise<{ profiles: S3Profile[]; activeId: string | null }> {
  const d = await jsonRequest<{ profiles: ProfileDto[]; activeId: string | null }>('/api/s3/profiles')
  return { profiles: d.profiles.map(fromDto), activeId: d.activeId }
}

export async function createProfile(input: ProfileInput): Promise<S3Profile> {
  const d = await jsonRequest<{ profile: ProfileDto }>('/api/s3/profiles', {
    method: 'POST',
    body: JSON.stringify(toPayload(input)),
  })
  return fromDto(d.profile)
}

export async function updateProfile(id: string, input: ProfileInput): Promise<S3Profile> {
  const d = await jsonRequest<{ profile: ProfileDto }>('/api/s3/profiles', {
    method: 'PATCH',
    body: JSON.stringify({ ...toPayload(input), id }),
  })
  return fromDto(d.profile)
}

export async function removeProfile(id: string): Promise<void> {
  await jsonRequest<{ ok: boolean }>(`/api/s3/profiles?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function activateProfile(id: string | null): Promise<void> {
  await jsonRequest<{ ok: boolean }>('/api/s3/profiles/activate', {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}