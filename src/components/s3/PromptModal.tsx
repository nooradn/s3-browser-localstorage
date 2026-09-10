import { useState } from 'preact/hooks'
import { Modal } from './Modal'

type Props = {
  title: string
  label: string
  initial?: string
  placeholder?: string
  confirmLabel?: string
  hint?: string
  onCancel: () => void
  onSubmit: (value: string) => void
}

export function PromptModal({
  title,
  label,
  initial = '',
  placeholder,
  confirmLabel = 'Simpan',
  hint,
  onCancel,
  onSubmit,
}: Props) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')

  function submit() {
    const v = value.trim()
    if (!v) {
      setError('Tidak boleh kosong')
      return
    }
    onSubmit(v)
  }

  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={460}
      footer={
        <div class="modal-actions">
          <button type="button" class="btn" onClick={onCancel}>
            Batal
          </button>
          <button type="button" class="btn btn-primary" onClick={submit}>
            {confirmLabel}
          </button>
        </div>
      }
    >
      <label class="field">
        <span class="label">{label}</span>
        <input
          class="input"
          value={value}
          placeholder={placeholder}
          autofocus
          onInput={(e) => {
            setValue(e.currentTarget.value)
            if (error) setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />
        {hint ? <span class="hint">{hint}</span> : null}
        {error ? <span class="field-error">{error}</span> : null}
      </label>
    </Modal>
  )
}