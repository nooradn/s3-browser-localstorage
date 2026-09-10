export type S3Profile = {
  id: string
  name: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

const STORAGE_KEY = 's3browser.profiles.v1'
const ACTIVE_KEY = 's3browser.activeProfile.v1'

export function newProfileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function loadProfiles(): S3Profile[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (p): p is S3Profile =>
        !!p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.endpoint === 'string' &&
        typeof p.accessKeyId === 'string' &&
        typeof p.secretAccessKey === 'string',
    )
  } catch {
    return []
  }
}

export function saveProfiles(list: S3Profile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function setActiveProfileId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_KEY, id)
  else localStorage.removeItem(ACTIVE_KEY)
}