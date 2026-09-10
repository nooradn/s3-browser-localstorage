import type { S3Item } from '../../lib/client/api'
import { formatBytes, formatDate, isImageName } from '../../lib/client/format'
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
  onOpenFolder: (key: string) => void
  onAction: (action: RowAction, item: S3Item) => void
  onAddProfile: () => void
}

export function FileTable({ items, loading, empty, hasProfile, hasBucket, onOpenFolder, onAction, onAddProfile }: Props) {
  if (empty && !loading) {
    return (
      <div class="table-wrap">
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
                <p>Pilih bucket dari daftar, atau pastikan kredensial punya izin ListBuckets.</p>
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

  return (
    <div class="table-wrap">
      <table class="s3-table">
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
              return (
                <tr
                  key={item.key}
                  class={isFolder ? 'row-folder' : 'row-file'}
                  onDblClick={() => {
                    if (isFolder) onOpenFolder(item.key)
                    else onAction('download', item)
                  }}
                >
                  <td>
                    <button
                      type="button"
                      class="row-main"
                      onClick={() => (isFolder ? onOpenFolder(item.key) : onAction('preview', item))}
                    >
                      <span class="file-type-icon">
                        {isFolder ? <FolderIcon size={18} /> : image ? <FileImageIcon size={18} /> : <FileIcon size={18} />}
                      </span>
                      <span class="row-name" title={item.name}>
                        {item.name}
                      </span>
                    </button>
                  </td>
                  <td class="cell-size">{isFolder ? '—' : formatBytes(item.size ?? null)}</td>
                  <td class="cell-date">{formatDate(item.lastModified)}</td>
                  <td class="cell-actions">
                    <div class="row-actions">
                      {image ? (
                        <button type="button" class="icon-btn" title="Lihat preview" onClick={() => onAction('preview', item)}>
                          <EyeIcon size={15} />
                        </button>
                      ) : null}
                      {!isFolder ? (
                        <button type="button" class="icon-btn" title="Download" onClick={() => onAction('download', item)}>
                          <DownloadIcon size={15} />
                        </button>
                      ) : null}
                      <button type="button" class="icon-btn" title="Ganti nama" onClick={() => onAction('rename', item)}>
                        <PencilIcon size={15} />
                      </button>
                      <button type="button" class="icon-btn" title="Copy / Pindahkan" onClick={() => onAction('copymove', item)}>
                        <CopyIcon size={15} />
                      </button>
                      <button type="button" class="icon-btn danger" title="Hapus" onClick={() => onAction('delete', item)}>
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