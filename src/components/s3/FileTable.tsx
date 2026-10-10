import type { S3Item } from '../../lib/client/api'
import { formatBytes, formatDate, isImageName } from '../../lib/client/format'
import type { ViewMode } from './Toolbar'
import {
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  FileIcon,
  FileImageIcon,
  FolderIcon,
  PencilIcon,
  SpinnerIcon,
  TrashIcon,
} from './Icons'

export type RowAction = 'download' | 'preview' | 'rename' | 'copymove' | 'delete'

type Props = {
  items: S3Item[]
  loading: boolean
  empty: boolean
  hasProfile: boolean
  hasBucket: boolean
  view: ViewMode
  selected: string | null
  onSelect: (key: string | null) => void
  onOpenFolder: (key: string) => void
  onAction: (action: RowAction, item: S3Item) => void
  onAddProfile: () => void
}

function tileIcon(isFolder: boolean, image: boolean) {
  if (isFolder) return <FolderIcon size={46} className="tile-folder" />
  if (image) return <FileImageIcon size={46} className="tile-image" />
  return <FileIcon size={46} className="tile-file" />
}

export function FileTable({
  items,
  loading,
  empty,
  hasProfile,
  hasBucket,
  view,
  selected,
  onSelect,
  onOpenFolder,
  onAction,
  onAddProfile,
}: Props) {
  if (empty && !loading) {
    return (
      <div class="table-wrap finder-scroll">
        <div class="empty-state">
          {hasProfile ? (
            hasBucket ? (
              <>
                <span class="empty-icon">
                  <FolderIcon size={40} />
                </span>
                <h3>Folder ini kosong</h3>
                <p>Upload file atau buat folder baru untuk memulai.</p>
              </>
            ) : (
              <>
                <span class="empty-icon">
                  <FileIcon size={40} />
                </span>
                <h3>Belum ada bucket</h3>
                <p>Pilih bucket dari sidebar "Bucket", atau pastikan kredensial punya izin ListBuckets.</p>
              </>
            )
          ) : (
            <>
              <span class="empty-icon">
                <FileIcon size={40} />
              </span>
              <h3>Tambah profil S3 dulu</h3>
              <p>Simpan endpoint & kredensial S3 custom kamu, lalu jelajahi bucket dan file.</p>
              <button type="button" class="btn btn-primary" onClick={onAddProfile}>
                Tambah profil
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (view === 'grid') {
    return (
      <div class="table-wrap finder-scroll">
        {loading ? (
          <div class="grid-loading">
            <SpinnerIcon className="spin" size={16} />
            <span>Memuat...</span>
          </div>
        ) : (
          <div class="finder-grid">
            {items.map((item) => {
              const isFolder = item.type === 'folder'
              const image = !isFolder && isImageName(item.name)
              const isSel = selected === item.key
              return (
                <button
                  type="button"
                  key={item.key}
                  class={`tile${isSel ? ' selected' : ''}`}
                  title={item.name}
                  onClick={() => {
                    onSelect(item.key)
                    if (isFolder) onOpenFolder(item.key)
                  }}
                  onDblClick={() => {
                    if (!isFolder) onAction('download', item)
                  }}
                >
                  <span class="tile-icon">{tileIcon(isFolder, image)}</span>
                  <span class="tile-name">{item.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div class="table-wrap finder-scroll">
      <table class="s3-table finder-table">
        <thead>
          <tr>
            <th class="col-name">Nama</th>
            <th class="col-size">Ukuran</th>
            <th class="col-date">Diubah</th>
            <th class="col-actions" aria-label="Aksi" />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr class="tr-loading">
              <td colspan={4}>
                <SpinnerIcon className="spin" size={16} />
                <span>Memuat...</span>
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isFolder = item.type === 'folder'
              const image = !isFolder && isImageName(item.name)
              const isSel = selected === item.key
              return (
                <tr
                  key={item.key}
                  class={`${isFolder ? 'row-folder' : 'row-file'}${isSel ? ' row-selected' : ''}`}
                  onClick={() => {
                    onSelect(item.key)
                    if (isFolder) onOpenFolder(item.key)
                  }}
                  onDblClick={() => {
                    if (isFolder) onOpenFolder(item.key)
                    else onAction('download', item)
                  }}
                >
                  <td>
                    <span class="row-main">
                      <span class="file-type-icon">
                        {isFolder ? <FolderIcon size={18} /> : image ? <FileImageIcon size={18} /> : <FileIcon size={18} />}
                      </span>
                      <span class="row-name" title={item.name}>
                        {item.name}
                      </span>
                    </span>
                  </td>
                  <td class="cell-size">{isFolder ? '—' : formatBytes(item.size ?? null)}</td>
                  <td class="cell-date">{formatDate(item.lastModified)}</td>
                  <td class="cell-actions">
                    <div class="row-actions">
                      {image ? (
                        <button
                          type="button"
                          class="icon-btn"
                          title="Lihat preview"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAction('preview', item)
                          }}
                        >
                          <EyeIcon size={15} />
                        </button>
                      ) : null}
                      {!isFolder ? (
                        <button
                          type="button"
                          class="icon-btn"
                          title="Download"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAction('download', item)
                          }}
                        >
                          <DownloadIcon size={15} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        class="icon-btn"
                        title="Ganti nama"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAction('rename', item)
                        }}
                      >
                        <PencilIcon size={15} />
                      </button>
                      <button
                        type="button"
                        class="icon-btn"
                        title="Copy / Pindahkan"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAction('copymove', item)
                        }}
                      >
                        <CopyIcon size={15} />
                      </button>
                      <button
                        type="button"
                        class="icon-btn danger"
                        title="Hapus"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAction('delete', item)
                        }}
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}