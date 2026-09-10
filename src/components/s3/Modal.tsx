import type { JSX } from 'preact'
import { XIcon } from './Icons'

type Props = {
  title: string
  onClose: () => void
  children: JSX.Element | JSX.Element[]
  footer?: JSX.Element | JSX.Element[] | null
  width?: number
}

export function Modal({ title, onClose, children, footer, width }: Props) {
  return (
    <div
      class="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div class="modal" role="dialog" aria-modal="true" style={width ? { maxWidth: width } : undefined}>
        <div class="modal-head">
          <h3>{title}</h3>
          <button type="button" class="icon-btn" aria-label="Tutup" onClick={onClose}>
            <XIcon />
          </button>
        </div>
        <div class="modal-body">{children}</div>
        {footer ? <div class="modal-foot">{footer}</div> : null}
      </div>
    </div>
  )
}