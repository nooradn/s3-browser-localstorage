import { useRef } from 'preact/hooks'
import {
  BackIcon,
  ChevronRightIcon,
  FolderPlusIcon,
  GridIcon,
  ListIcon,
  RefreshIcon,
  SearchIcon,
  SpinnerIcon,
  UploadIcon,
} from './Icons'

export type ViewMode = 'grid' | 'list'

type Props = {
  disabled: boolean
  busy: string | null
  query: string
  onQuery: (q: string) => void
  onUpload: (files: FileList | null) => void
  onNewFolder: () => void
  onRefresh: () => void
  view: ViewMode
  onView: (v: ViewMode) => void
  canBack: boolean
  canForward: boolean
  onBack: () => void
  onForward: () => void
}

export function Toolbar({
  disabled,
  busy,
  query,
  onQuery,
  onUpload,
  onNewFolder,
  onRefresh,
  view,
  onView,
  canBack,
  canForward,
  onBack,
  onForward,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div class="toolbar">
      <div class="toolbar-left">
        <button type="button" class="tool-btn" title="Kembali" disabled={!canBack} onClick={onBack}>
          <BackIcon size={16} />
        </button>
        <button type="button" class="tool-btn" title="Maju" disabled={!canForward} onClick={onForward}>
          <ChevronRightIcon size={16} />
        </button>
        <span class="tool-sep" aria-hidden="true" />
        <span class="seg-view">
          <button
            type="button"
            class={`seg-view-btn${view === 'grid' ? ' active' : ''}`}
            title="Tampilan ikon"
            onClick={() => onView('grid')}
          >
            <GridIcon size={16} />
          </button>
          <button
            type="button"
            class={`seg-view-btn${view === 'list' ? ' active' : ''}`}
            title="Tampilan daftar"
            onClick={() => onView('list')}
          >
            <ListIcon size={16} />
          </button>
        </span>
      </div>
      <div class="toolbar-right">
        {busy ? (
          <span class="busy-chip">
            <SpinnerIcon className="spin" size={14} />
            {busy}
          </span>
        ) : null}
        <div class="search">
          <SearchIcon size={14} />
          <input
            class="input search-input"
            placeholder="Cari"
            value={query}
            onInput={(e) => onQuery(e.currentTarget.value)}
          />
        </div>
        <span class="tool-sep" aria-hidden="true" />
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => onUpload(e.currentTarget.files)} />
        <button type="button" class="tool-btn" title="Upload file" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <UploadIcon size={16} />
        </button>
        <button type="button" class="tool-btn" title="Folder baru" disabled={disabled} onClick={onNewFolder}>
          <FolderPlusIcon size={16} />
        </button>
        <button type="button" class="tool-btn" title="Muat ulang" disabled={disabled} onClick={onRefresh}>
          <RefreshIcon size={16} />
        </button>
      </div>
    </div>
  )
}