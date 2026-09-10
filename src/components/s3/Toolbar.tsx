import { useRef } from 'preact/hooks'
import { FolderPlusIcon, RefreshIcon, SearchIcon, SpinnerIcon, UploadIcon } from './Icons'

type Props = {
  disabled: boolean
  busy: string | null
  query: string
  onQuery: (q: string) => void
  onUpload: (files: FileList | null) => void
  onNewFolder: () => void
  onRefresh: () => void
}

export function Toolbar({ disabled, busy, query, onQuery, onUpload, onNewFolder, onRefresh }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div class="toolbar">
      <div class="toolbar-left">
        <button type="button" class="btn btn-primary" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <UploadIcon size={16} />
          <span>Upload</span>
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => onUpload(e.currentTarget.files)} />
        <button type="button" class="btn" disabled={disabled} onClick={onNewFolder}>
          <FolderPlusIcon size={16} />
          <span>Folder baru</span>
        </button>
        <button type="button" class="btn icon-btn" title="Muat ulang" disabled={disabled} onClick={onRefresh}>
          <RefreshIcon />
        </button>
      </div>
      <div class="toolbar-right">
        {busy ? (
          <span class="busy-chip">
            <SpinnerIcon className="spin" size={14} />
            {busy}
          </span>
        ) : null}
        <div class="search">
          <SearchIcon size={15} />
          <input class="input" placeholder="Cari nama file..." value={query} onInput={(e) => onQuery(e.currentTarget.value)} />
        </div>
      </div>
    </div>
  )
}