import { useState } from 'preact/hooks'
import type { S3Profile } from '../../lib/client/profiles'
import { Modal } from './Modal'
import { PencilIcon, PlusIcon, ServerIcon, TrashIcon } from './Icons'

type Draft = {
  id: string
  name: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

function emptyDraft(): Draft {
  return {
    id: '',
    name: '',
    endpoint: '',
    region: 'auto',
    accessKeyId: '',
    secretAccessKey: '',
    forcePathStyle: true,
  }
}

function draftFromProfile(p: S3Profile): Draft {
  return { ...p }
}

function cleanEndpoint(value: string): string {
  let e = value.trim().replace(/\/+$/, '')
  if (e && !/^[a-z]+:\/\//i.test(e)) e = `https://${e}`
  return e
}

type Props = {
  profiles: S3Profile[]
  activeId: string | null
  onSave: (p: S3Profile) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function ProfileModal({ profiles, activeId, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [error, setError] = useState('')

  const editing = Boolean(draft.id)

  function pick(p: S3Profile) {
    setDraft(draftFromProfile(p))
    setError('')
  }

  function reset() {
    setDraft(emptyDraft())
    setError('')
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    if (error) setError('')
  }

  function submit() {
    const name = draft.name.trim()
    const endpoint = cleanEndpoint(draft.endpoint)
    const accessKeyId = draft.accessKeyId.trim()
    const secretAccessKey = draft.secretAccessKey.trim()

    if (!name) return setError('Nama profil wajib diisi')
    if (!endpoint) return setError('Endpoint S3 wajib diisi')
    if (!accessKeyId) return setError('Access Key wajib diisi')
    if (!secretAccessKey) return setError('Secret Key wajib diisi')

    onSave({
      id: draft.id,
      name,
      endpoint,
      region: (draft.region.trim() || 'auto').replace(/^https?:\/\//i, ''),
      accessKeyId,
      secretAccessKey,
      forcePathStyle: draft.forcePathStyle,
    })
    reset()
  }

  return (
    <Modal
      title="Profil S3"
      onClose={onClose}
      width={620}
      footer={
        <div class="modal-actions">
          <button type="button" class="btn" onClick={onClose}>
            Tutup
          </button>
          {editing ? (
            <button
              type="button"
              class="btn btn-danger"
              onClick={() => {
                onDelete(draft.id)
                reset()
              }}
            >
              Hapus profil
            </button>
          ) : null}
          <button type="button" class="btn btn-primary" onClick={submit}>
            {editing ? 'Simpan perubahan' : 'Tambah profil'}
          </button>
        </div>
      }
    >
      <div class="profile-modal">
        <div class="profile-list">
          <div class="profile-list-head">
            <span>Profil tersimpan</span>
            <button type="button" class="btn btn-ghost btn-sm" onClick={reset}>
              <PlusIcon size={14} /> Baru
            </button>
          </div>
          {profiles.length === 0 ? (
            <p class="hint">Belum ada profil. Tambahkan kredensial S3 pertama kamu.</p>
          ) : (
            <ul class="profile-list-ul">
              {profiles.map((p) => (
                <li
                  key={p.id}
                  class={p.id === activeId ? 'active' : ''}
                  onClick={() => pick(p)}
                >
                  <span class="profile-list-icon">
                    <ServerIcon size={16} />
                  </span>
                  <span class="profile-list-meta">
                    <span class="profile-list-name">{p.name}</span>
                    <span class="profile-list-endpoint">{p.endpoint}</span>
                  </span>
                  {p.id === activeId ? <span class="badge">aktif</span> : null}
                  <span class="profile-list-actions">
                    <button type="button" class="icon-btn" aria-label="Edit" onClick={(e) => { e.stopPropagation(); pick(p) }}>
                      <PencilIcon size={14} />
                    </button>
                    <button
                      type="button"
                      class="icon-btn danger"
                      aria-label="Hapus"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(p.id)
                        if (draft.id === p.id) reset()
                      }}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div class="profile-form">
          <h4>{editing ? 'Edit profil' : 'Profil baru'}</h4>
          <div class="field">
            <span class="label">Nama profil</span>
            <input class="input" placeholder="mis. MinIO Production" value={draft.name} onInput={(e) => set('name', e.currentTarget.value)} />
          </div>
          <div class="field">
            <span class="label">Endpoint S3</span>
            <input class="input" placeholder="mis. s3.amazonaws.com / minio.example.com:9000" value={draft.endpoint} onInput={(e) => set('endpoint', e.currentTarget.value)} />
            <span class="hint">Tanpa awalan https:// boleh, nanti otomatis ditambahkan.</span>
          </div>
          <div class="field">
            <span class="label">Region</span>
            <input class="input" placeholder="auto" value={draft.region} onInput={(e) => set('region', e.currentTarget.value)} />
          </div>
          <label class="checkbox-row">
            <input type="checkbox" checked={draft.forcePathStyle} onChange={(e) => set('forcePathStyle', e.currentTarget.checked)} />
            <span>Path-style URL (umum untuk MinIO / endpoint custom)</span>
          </label>
          <div class="field">
            <span class="label">Access Key ID</span>
            <input class="input" placeholder="AKIA..." value={draft.accessKeyId} onInput={(e) => set('accessKeyId', e.currentTarget.value)} spellcheck={false} />
          </div>
          <div class="field">
            <span class="label">Secret Access Key</span>
            <input class="input" type="password" placeholder="••••••••" value={draft.secretAccessKey} onInput={(e) => set('secretAccessKey', e.currentTarget.value)} />
            <span class="hint">Kredensial tersimpan di penyimpanan lokal browser (localStorage/sessionStorage) dan hanya dikirim ke server saat request S3.</span>
          </div>
          {error ? <p class="field-error">{error}</p> : null}
        </div>
      </div>
    </Modal>
  )
}