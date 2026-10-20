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

const STORAGE_KEY = 's3browser.profiles.v1'
const ACTIVE_KEY = 's3browser.activeProfile.v1'

export function newProfileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    const test = '__s3_test__'
    window.localStorage.setItem(test, test)
    window.localStorage.removeItem(test)
    return window.localStorage
  } catch {
    try {
      return window.sessionStorage
    } catch {
      return null
    }
  }
}

export function loadProfiles(): S3Profile[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]')
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
  const storage = getStorage()
  if (!storage) return
  storage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function getActiveProfileId(): string | null {
  const storage = getStorage()
  if (!storage) return null
  return storage.getItem(ACTIVE_KEY)
}

export function setActiveProfileId(id: string | null): void {
  const storage = getStorage()
  if (!storage) return
  if (id) storage.setItem(ACTIVE_KEY, id)
  else storage.removeItem(ACTIVE_KEY)
}

export function clearLocalStorage(): void {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(STORAGE_KEY)
  storage.removeItem(ACTIVE_KEY)
}

export async function fetchProfiles(): Promise<{ profiles: S3Profile[]; activeId: string | null }> {
  const profiles = loadProfiles()
  let activeId = getActiveProfileId()
  if (!activeId || !profiles.some((p) => p.id === activeId)) {
    activeId = profiles[0]?.id ?? null
    setActiveProfileId(activeId)
  }
  return { profiles, activeId }
}

export async function createProfile(input: ProfileInput): Promise<S3Profile> {
  const profiles = loadProfiles()
  const profile: S3Profile = {
    id: newProfileId(),
    name: input.name.trim(),
    endpoint: input.endpoint.trim(),
    region: input.region.trim() || 'auto',
    accessKeyId: input.accessKeyId.trim(),
    secretAccessKey: input.secretAccessKey.trim(),
    forcePathStyle: input.forcePathStyle,
  }
  profiles.push(profile)
  saveProfiles(profiles)
  return profile
}

export async function updateProfile(id: string, input: ProfileInput): Promise<S3Profile> {
  const profiles = loadProfiles()
  const idx = profiles.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('Profil tidak ditemukan')
  const updated: S3Profile = {
    id,
    name: input.name.trim(),
    endpoint: input.endpoint.trim(),
    region: input.region.trim() || 'auto',
    accessKeyId: input.accessKeyId.trim(),
    secretAccessKey: input.secretAccessKey.trim(),
    forcePathStyle: input.forcePathStyle,
  }
  profiles[idx] = updated
  saveProfiles(profiles)
  return updated
}

export async function removeProfile(id: string): Promise<void> {
  const profiles = loadProfiles().filter((p) => p.id !== id)
  saveProfiles(profiles)
  if (getActiveProfileId() === id) {
    setActiveProfileId(profiles[0]?.id ?? null)
  }
}

export async function activateProfile(id: string | null): Promise<void> {
  setActiveProfileId(id)
}
