import { useState } from 'preact/hooks'
import type { JSX } from 'preact'
import { Modal } from './Modal'

type Props = {
  title: string
  message: JSX.Element | string
  confirmLabel?: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmModal({ title, message, confirmLabel = 'Hapus', danger = true, onCancel, onConfirm }: Props) {
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={440}
      footer={
        <div class="modal-actions">
          <button type="button" class="btn" onClick={onCancel}>
            Batal
          </button>
          <button type="button" class={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={confirm} disabled={busy}>
            {busy ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      }
    >
      <p class="confirm-message">{message}</p>
    </Modal>
  )
}