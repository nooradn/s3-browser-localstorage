import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import type { ApiError, S3Item } from '../../lib/client/api'
import {
  copyEntry,
  deleteEntry,
  downloadBlob,
  listBuckets,
  listObjects,
  makeFolderApi,
  moveEntry,
  triggerDownload,
  uploadFile,
} from '../../lib/client/api'
import {
  getActiveProfileId,
  loadProfiles,
  saveProfiles,
  setActiveProfileId,
  type S3Profile,
} from '../../lib/client/profiles'
import { errMessage, joinKey, parentKey } from '../../lib/client/format'
import { Toolbar } from './Toolbar'
import { FileTable, type RowAction } from './FileTable'
import { ProfileModal } from './ProfileModal'
import { PromptModal } from './PromptModal'
import { ConfirmModal } from './ConfirmModal'
import { CopyMoveModal } from './CopyMoveModal'
import { CloudIcon, LogoutIcon, ServerIcon } from './Icons'

type Toast = { id: number; message: string; kind: 'success' | 'error' | 'info' }

type PromptState = {
  title: string
  label: string
  initial: string
  confirmLabel: string
  hint?: string
  onSubmit: (value: string) => void | Promise<void>
}

type ConfirmState = {
  title: string
  message: string | JSX.Element
  confirmLabel: string
  onConfirm: () => void | Promise<void>
}

type CopyMoveState = {
  item: S3Item
  mode: 'copy' | 'move'
}

type Props = {
  user?: { id: string; email: string | null } | null
}

export default function FileBrowser({ user }: Props) {
  const [profiles, setProfiles] = useState<S3Profile[]>(() => loadProfiles())
  const [activeId, setActiveId] = useState<string | null>(() => getActiveProfileId())
  const active = useMemo(() => profiles.find((p) => p.id === activeId) ?? null, [profiles, activeId])

  const [buckets, setBuckets] = useState<string[]>([])
  const [bucket, setBucket] = useState<string | null>(null)
  const [prefix, setPrefix] = useState('')
  const [items, setItems] = useState<S3Item[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [toasts, setToasts] = useState<Toast[]>([])
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [prompt, setPrompt] = useState<PromptState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [copyMove, setCopyMove] = useState<CopyMoveState | null>(null)

  const pushToast = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, kind }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  const handleErr = useCallback(
    (e: unknown) => {
      const message = errMessage(e)
      const status = (e as ApiError)?.status
      if (status === 401) {
        pushToast('Sesi berakhir, silakan login ulang', 'error')
        window.setTimeout(() => {
          window.location.href = '/login'
        }, 1200)
        return
      }
      pushToast(message, 'error')
    },
    [pushToast],
  )

  const bump = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    const list = loadProfiles()
    const stored = getActiveProfileId()
    if (!stored || !list.some((p) => p.id === stored)) {
      if (list.length) {
        setActiveProfileId(list[0].id)
        setActiveId(list[0].id)
      } else {
        setActiveProfileId(null)
        setActiveId(null)
      }
    }
  }, [])

  useEffect(() => {
    setBuckets([])
    setBucket(null)
    setPrefix('')
    setItems([])
    setLoaded(false)
    if (!active) return
    let cancelled = false
    listBuckets(active)
      .then((d) => {
        if (!cancelled) setBuckets(d.buckets.map((b) => b.name))
      })
      .catch((e: unknown) => {
        if (!cancelled) handleErr(e)
      })
    return () => {
      cancelled = true
    }
  }, [active, handleErr])

  useEffect(() => {
    if (!active || !bucket) {
      setItems([])
      setLoaded(false)
      return
    }
    let cancelled = false
    setLoading(true)
    listObjects(active, bucket, prefix)
      .then((d) => {
        if (!cancelled) {
          setItems(d.items)
          setLoaded(true)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setItems([])
          setLoaded(true)
          handleErr(e)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [active, bucket, prefix, refreshKey, handleErr])

  function selectProfile(id: string) {
    if (!id) return
    setActiveProfileId(id)
    setActiveId(id)
  }

  function saveProfile(p: S3Profile) {
    setProfiles((prev) => {
      const exists = prev.some((x) => x.id === p.id)
      const next = exists ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p]
      saveProfiles(next)
      return next
    })
    setActiveProfileId(p.id)
    setActiveId(p.id)
    pushToast('Profil disimpan', 'success')
  }

  function removeProfile(id: string) {
    setProfiles((prev) => {
      const next = prev.filter((x) => x.id !== id)
      saveProfiles(next)
      return next
    })
    if (activeId === id) {
      const rest = profiles.filter((x) => x.id !== id)
      const first = rest[0] ?? null
      setActiveProfileId(first?.id ?? null)
      setActiveId(first?.id ?? null)
    }
    pushToast('Profil dihapus', 'info')
  }

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!active || !bucket) {
      pushToast('Pilih profil & bucket dulu', 'error')
      return
    }
    const list = Array.from(files)
    let ok = 0
    let fail = 0
    setBusy(`Upload 0/${list.length}`)
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      try {
        await uploadFile(active, bucket, joinKey(prefix, f.name), f)
        ok++
      } catch (e) {
        fail++
        console.error(e)
      }
      setBusy(`Upload ${i + 1}/${list.length}${fail ? ` (${fail} gagal)` : ''}`)
    }
    setBusy(null)
    if (ok) {
      pushToast(`${ok} file berhasil diupload${fail ? `, ${fail} gagal` : ''}`, fail ? 'info' : 'success')
      bump()
    } else {
      pushToast('Semua file gagal diupload', 'error')
    }
  }

  async function download(item: S3Item) {
    if (!active || !bucket) return
    setBusy(`Menyiapkan ${item.name}...`)
    try {
      const res = await downloadBlob(active, bucket, item.key)
      triggerDownload(res.blob, item.name)
      pushToast(`Download ${item.name} selesai`, 'success')
    } catch (e) {
      handleErr(e)
    } finally {
      setBusy(null)
    }
  }

  async function preview(item: S3Item) {
    if (!active || !bucket) return
    setBusy(`Memuat preview ${item.name}...`)
    try {
      const res = await downloadBlob(active, bucket, item.key, true)
      const url = URL.createObjectURL(res.blob)
      window.open(url, '_blank')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      handleErr(e)
    } finally {
      setBusy(null)
    }
  }

  async function rename(item: S3Item, newName: string) {
    if (!active || !bucket) return
    const parent = parentKey(item.key)
    const target = joinKey(parent, newName) + (item.type === 'folder' ? '/' : '')
    setBusy(`Mengganti nama ${item.name}...`)
    try {
      await moveEntry(active, bucket, item.key, target, { isFolder: item.type === 'folder' })
      pushToast(`Diganti menjadi ${newName}`, 'success')
      bump()
    } catch (e) {
      handleErr(e)
    } finally {
      setBusy(null)
    }
  }

  async function remove(item: S3Item) {
    if (!active || !bucket) return
    setBusy(`Menghapus ${item.name}...`)
    try {
      const r = await deleteEntry(active, bucket, item.key, item.type === 'folder')
      pushToast(
        `Dihapus ${item.name}${item.type === 'folder' ? ` (${r.deleted} objek)` : ''}`,
        'success',
      )
      bump()
    } catch (e) {
      handleErr(e)
    } finally {
      setBusy(null)
    }
  }

  async function onCopyMove({ targetBucket, targetPath, mode }: { targetBucket: string; targetPath: string; mode: 'copy' | 'move' }) {
    if (!active || !bucket || !copyMove) return
    const { item } = copyMove
    setBusy(`${mode === 'move' ? 'Memindahkan' : 'Menyalin'} ${item.name}...`)
    try {
      if (mode === 'move') {
        const r = await moveEntry(active, bucket, item.key, targetPath, {
          targetBucket,
          isFolder: item.type === 'folder',
        })
        pushToast(`Dipindahkan ${item.name} (${r.moved} objek)`, 'success')
      } else {
        const r = await copyEntry(active, bucket, item.key, targetPath, {
          targetBucket,
          isFolder: item.type === 'folder',
        })
        pushToast(`Disalin ${item.name} (${r.copied} objek)`, 'success')
      }
      setCopyMove(null)
      bump()
    } catch (e) {
      handleErr(e)
    } finally {
      setBusy(null)
    }
  }

  function onRowAction(action: RowAction, item: S3Item) {
    if (action === 'download') void download(item)
    else if (action === 'preview') void preview(item)
    else if (action === 'rename') {
      setPrompt({
        title: `Ganti nama ${item.type === 'folder' ? 'folder' : 'file'}`,
        label: 'Nama baru',
        initial: item.name,
        confirmLabel: 'Simpan',
        hint: item.type === 'folder' ? 'Folder akan dibuat ulang dengan nama baru.' : undefined,
        onSubmit: (value) => rename(item, value),
      })
    } else if (action === 'copymove') {
      setCopyMove({ item, mode: 'copy' })
    } else if (action === 'delete') {
      setConfirm({
        title: `Hapus ${item.type === 'folder' ? 'folder' : 'file'}`,
        message: (
          <>
            Hapus <strong>{item.name}</strong>
            {item.type === 'folder' ? ' beserta seluruh isinya' : ''}? Tindakan ini tidak bisa dibatalkan.
          </>
        ),
        confirmLabel: 'Hapus',
        onConfirm: () => remove(item),
      })
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.name.toLowerCase().includes(q))
  }, [items, query])

  const crumbs = useMemo(() => {
    const segs = prefix.split('/').filter(Boolean)
    return segs.map((s, i) => ({
      name: s,
      key: segs.slice(0, i + 1).join('/') + '/',
    }))
  }, [prefix])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    window.location.href = '/login'
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    void onUpload(e.dataTransfer?.files ?? null)
  }

  return (
    <div class="s3-app">
      <header class="topbar">
        <div class="brand">
          <span class="brand-icon">
            <CloudIcon size={22} />
          </span>
          <span class="brand-name">S3 Browser</span>
        </div>
        <div class="topbar-profile">
          <select
            class="input select-inline"
            value={active?.id ?? ''}
            onChange={(e) => selectProfile(e.currentTarget.value)}
          >
            {!profiles.length ? <option value="">— tambah profil S3 —</option> : null}
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="button" class="btn icon-btn" title="Kelola profil S3" onClick={() => setProfileModalOpen(true)}>
            <ServerIcon />
          </button>
        </div>
        <div class="topbar-right">
          <span class="user-chip" title={user?.email ?? ''}>
            {user?.email ?? ''}
          </span>
          <button type="button" class="btn btn-ghost icon-btn" title="Keluar" onClick={logout}>
            <LogoutIcon />
          </button>
        </div>
      </header>

      <main
        class="browser"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          if (e.currentTarget === e.target) setDragOver(false)
        }}
        onDrop={onDrop}
      >
        <Toolbar
          disabled={!active || !bucket}
          busy={busy}
          query={query}
          onQuery={setQuery}
          onUpload={(files) => void onUpload(files)}
          onNewFolder={() =>
            setPrompt({
              title: 'Buat folder baru',
              label: 'Nama folder',
              initial: '',
              confirmLabel: 'Buat',
              onSubmit: async (value) => {
                if (!active || !bucket) return
                if (!/^[^/\\]+$/.test(value)) throw new Error('Nama folder tidak boleh mengandung "/"')
                await makeFolderApi(active, bucket, joinKey(prefix, value))
                pushToast(`Folder "${value}" dibuat`, 'success')
                bump()
              },
            })
          }
          onRefresh={bump}
        />

        {dragOver ? <div class="drop-hint">Lepaskan file untuk upload</div> : null}

        <div class="bucketbar">
          <select
            class="input select-inline bucket-select"
            value={bucket ?? ''}
            disabled={!buckets.length}
            onChange={(e) => {
              setBucket(e.currentTarget.value || null)
              setPrefix('')
            }}
          >
            {!buckets.length ? <option value="">— pilih bucket —</option> : null}
            {buckets.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <nav class="crumbs" aria-label="Breadcrumb">
            <button type="button" class="crumb-link root" onClick={() => setPrefix('')}>
              s3://{bucket ?? '…'}
            </button>
            {crumbs.map((c) => (
              <span class="crumb" key={c.key}>
                <span class="crumb-sep">/</span>
                <button type="button" class="crumb-link" onClick={() => setPrefix(c.key)}>
                  {c.name}
                </button>
              </span>
            ))}
          </nav>
        </div>

        <FileTable
          items={filtered}
          loading={loading}
          empty={!loaded || (!loading && !filtered.length)}
          hasProfile={!!active}
          hasBucket={!!bucket}
          onOpenFolder={setPrefix}
          onAction={onRowAction}
          onAddProfile={() => setProfileModalOpen(true)}
        />

        <footer class="statusbar">
          <span>{loading ? 'Memuat...' : `${filtered.length} item`}</span>
          <span class="statusbar-right">
            {active ? (
              <>
                <span class="status-dot" title="profil aktif" />
                {active.endpoint}
                {active.region && active.region !== 'auto' ? ` · ${active.region}` : ''}
              </>
            ) : (
              'Belum ada profil aktif'
            )}
          </span>
        </footer>
      </main>

      {profileModalOpen ? (
        <ProfileModal
          profiles={profiles}
          activeId={activeId}
          onSave={saveProfile}
          onDelete={removeProfile}
          onClose={() => setProfileModalOpen(false)}
        />
      ) : null}

      {prompt ? (
        <PromptModal
          title={prompt.title}
          label={prompt.label}
          initial={prompt.initial}
          confirmLabel={prompt.confirmLabel}
          hint={prompt.hint}
          onCancel={() => setPrompt(null)}
          onSubmit={(value) => {
            setPrompt(null)
            void Promise.resolve(prompt.onSubmit(value)).catch(handleErr)
          }}
        />
      ) : null}

      {confirm ? (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            Promise.resolve(confirm.onConfirm()).then(
              () => setConfirm(null),
              (e: unknown) => {
                setConfirm(null)
                handleErr(e)
              },
            )
          }
        />
      ) : null}

      {copyMove ? (
        <CopyMoveModal
          item={copyMove.item}
          buckets={buckets}
          defaultBucket={bucket ?? ''}
          defaultPath={joinKey(prefix, copyMove.item.name)}
          mode={copyMove.mode}
          onCancel={() => setCopyMove(null)}
          onSubmit={(opts) => {
            setCopyMove(null)
            void onCopyMove(opts)
          }}
        />
      ) : null}

      <div class="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <button
            type="button"
            key={t.id}
            class={`toast toast-${t.kind}`}
            onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
          >
            {t.kind === 'success' ? (
              <span class="toast-icon">✓</span>
            ) : t.kind === 'error' ? (
              <span class="toast-icon">✕</span>
            ) : (
              <span class="toast-icon">i</span>
            )}
            <span>{t.message}</span>
          </button>
        ))}
      </div>
    </div>
  )
}