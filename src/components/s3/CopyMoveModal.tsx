import { useState } from 'preact/hooks'
import type { S3Item } from '../../lib/client/api'
import { Modal } from './Modal'

type Props = {
  item: S3Item
  buckets: string[]
  defaultBucket: string
  defaultPath: string
  mode: 'copy' | 'move'
  onCancel: () => void
  onSubmit: (opts: { targetBucket: string; targetPath: string; mode: 'copy' | 'move' }) => void
}

export function CopyMoveModal({ item, buckets, defaultBucket, defaultPath, mode, onCancel, onSubmit }: Props) {
  const [targetBucket, setTargetBucket] = useState(defaultBucket)
  const [targetPath, setTargetPath] = useState(defaultPath)
  const [optMode, setOptMode] = useState<'copy' | 'move'>(mode)
  const [error, setError] = useState('')

  const isFolder = item.type === 'folder'

  function submit() {
    let path = targetPath.trim()
    if (!path) return setError('Path tujuan wajib diisi')
    if (isFolder && !path.endsWith('/')) path = `${path}/`
    if (targetBucket === defaultBucket && path === item.key) {
      return setError('Target sama dengan sumber')
    }
    onSubmit({ targetBucket, targetPath: path, mode: optMode })
  }

  return (
    <Modal
      title={optMode === 'move' ? 'Pindahkan item' : 'Salin item'}
      onClose={onCancel}
      width={480}
      footer={
        <div class="modal-actions">
          <button type="button" class="btn" onClick={onCancel}>
            Batal
          </button>
          <button type="button" class="btn btn-primary" onClick={submit}>
            {optMode === 'move' ? 'Pindahkan' : 'Salin'}
          </button>
        </div>
      }
    >
      <p class="confirm-message">
        {optMode === 'move' ? 'Memindahkan' : 'Menyalin'} <strong>{item.name}</strong>{' '}
        {isFolder ? '(folder)' : ''}
      </p>

      <div class="seg">
        <button type="button" class={optMode === 'copy' ? 'seg-item active' : 'seg-item'} onClick={() => setOptMode('copy')}>
          Copy
        </button>
        <button type="button" class={optMode === 'move' ? 'seg-item active' : 'seg-item'} onClick={() => setOptMode('move')}>
          Pindah
        </button>
      </div>

      <div class="field">
        <span class="label">Bucket tujuan</span>
        <select class="input" value={targetBucket} onChange={(e) => setTargetBucket(e.currentTarget.value)}>
          {buckets.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div class="field">
        <span class="label">Key tujuan</span>
        <input class="input" value={targetPath} onInput={(e) => setTargetPath(e.currentTarget.value)} spellcheck={false} autofocus />
        <span class="hint">Key lengkap di bucket tujuan. Gunakan "/" sebagai pemisah folder.</span>
      </div>
      {error ? <p class="field-error">{error}</p> : null}
    </Modal>
  )
}