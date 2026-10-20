import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import type { S3Item } from '../../lib/client/api'
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
  activateProfile as activateProfileApi,
  clearLocalStorage,
  createProfile as createProfileApi,
  fetchProfiles as fetchProfilesApi,
  removeProfile as removeProfileApi,
  updateProfile as updateProfileApi,
  type ProfileInput,
  type S3Profile,
} from '../../lib/client/profiles'
import { errMessage, joinKey, parentKey } from '../../lib/client/format'
import { Toolbar, type ViewMode } from './Toolbar'
import { FileTable, type RowAction } from './FileTable'
import { ProfileModal } from './ProfileModal'
import { PromptModal } from './PromptModal'
import { ConfirmModal } from './ConfirmModal'
import { CopyMoveModal } from './CopyMoveModal'
import { CloudIcon, FolderIcon, LogoutIcon, ServerIcon } from './Icons'
import ThemeToggle from '../ThemeToggle'

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

type NavLocation = { bucket: string | null; prefix: string }

export default function FileBrowser() {
  const [profiles, setProfiles] = useState<S3Profile[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
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

  const [view, setView] = useState<ViewMode>('grid')
  const [selected, setSelected] = useState<string | null>(null)
  const [nav, setNav] = useState<{ stack: NavLocation[]; idx: number }>({ stack: [], idx: -1 })

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
      pushToast(message, 'error')
    },
    [pushToast],
  )

  const bump = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    try {
      const v = localStorage.getItem('s3browser.view')
      if (v === 'grid' || v === 'list') setView(v)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('s3browser.view', view)
    } catch {
      // ignore
    }
  }, [view])

  useEffect(() => {
    let cancelled = false
    fetchProfilesApi()
      .then(({ profiles: list, activeId: id }) => {
        if (cancelled) return
        setProfiles(list)
        const next = id ?? list[0]?.id ?? null
        if (next !== id) void activateProfileApi(next).catch(handleErr)
        setActiveId(next)
      })
      .catch((e: unknown) => handleErr(e))
      .finally(() => {
        if (!cancelled) setLoadingProfiles(false)
      })
    return () => {
      cancelled = true
    }
  }, [handleErr])

  useEffect(() => {
    setBuckets([])
    setBucket(null)
    setPrefix('')
    setItems([])
    setLoaded(false)
    setNav({ stack: [], idx: -1 })
    setSelected(null)
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

  function navigate(loc: NavLocation) {
    setBucket(loc.bucket)
    setPrefix(loc.prefix)
    setSelected(null)
    setNav((prev) => {
      const stack = prev.stack.slice(0, prev.idx + 1)
      stack.push(loc)
      return { stack, idx: stack.length - 1 }
    })
  }

  function goBack() {
    if (nav.idx <= 0) return
    const loc = nav.stack[nav.idx - 1]
    setBucket(loc.bucket)
    setPrefix(loc.prefix)
    setSelected(null)
    setNav((prev) => ({ ...prev, idx: prev.idx - 1 }))
  }

  function goForward() {
    if (nav.idx >= nav.stack.length - 1) return
    const loc = nav.stack[nav.idx + 1]
    setBucket(loc.bucket)
    setPrefix(loc.prefix)
    setSelected(null)
    setNav((prev) => ({ ...prev, idx: prev.idx + 1 }))
  }

  async function selectProfile(id: string) {
    if (!id) return
    try {
      await activateProfileApi(id)
      setActiveId(id)
    } catch (e) {
      handleErr(e)
    }
  }

  async function saveProfile(p: S3Profile) {
    const exists = profiles.some((x) => x.id === p.id)
    const input: ProfileInput = {
      name: p.name,
      endpoint: p.endpoint,
      region: p.region,
      accessKeyId: p.accessKeyId,
      secretAccessKey: p.secretAccessKey,
      forcePathStyle: p.forcePathStyle,
    }
    try {
      const saved = exists ? await updateProfileApi(p.id, input) : await createProfileApi(input)
      setProfiles((prev) => {
        const has = prev.some((x) => x.id === saved.id)
        return has ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved]
      })
      await activateProfileApi(saved.id)
      setActiveId(saved.id)
      pushToast('Profil disimpan', 'success')
    } catch (e) {
      handleErr(e)
    }
  }

  async function removeProfile(id: string) {
    try {
      await removeProfileApi(id)
      setProfiles((prev) => prev.filter((x) => x.id !== id))
      if (activeId === id) {
        const rest = profiles.filter((x) => x.id !== id)
        const first = rest[0] ?? null
        await activateProfileApi(first?.id ?? null)
        setActiveId(first?.id ?? null)
      }
      pushToast('Profil dihapus', 'info')
    } catch (e) {
      handleErr(e)
    }
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

  const selectedName = useMemo(() => items.find((i) => i.key === selected)?.name ?? null, [items, selected])

  function onClearSession() {
    setConfirm({
      title: 'Hapus data sesi lokal',
      message: 'Hapus semua profil S3 yang tersimpan di browser ini?',
      confirmLabel: 'Hapus',
      onConfirm: () => {
        clearLocalStorage()
        setProfiles([])
        setActiveId(null)
        setBuckets([])
        setBucket(null)
        setPrefix('')
        setItems([])
        pushToast('Data lokal berhasil dibersihkan', 'info')
      },
    })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    void onUpload(e.dataTransfer?.files ?? null)
  }

  return (
    <div class="s3-app finder">
      <header class="titlebar">
        <div class="traffic" aria-hidden="true">
          <span class="tl red" />
          <span class="tl yellow" />
          <span class="tl green" />
        </div>
        <div class="titlebar-title" title={active ? `${active.name} · ${active.endpoint}` : 'S3 Browser'}>
          {active ? active.name : 'S3 Browser'}
        </div>
        <div class="titlebar-right">
          <ThemeToggle />
          <span class="user-chip" title="Penyimpanan lokal di browser">
            Local Storage
          </span>
          <button
            type="button"
            class="tool-btn"
            title="Hapus sesi / penyimpanan lokal"
            onClick={onClearSession}
          >
            <LogoutIcon size={16} />
          </button>
        </div>
      </header>

      <div class="finder-body">
        <aside class="sidebar">
          <div class="side-section">
            <div class="side-head">Favorit</div>
            {profiles.length === 0 ? (
              <p class="side-empty">{loadingProfiles ? 'Memuat...' : 'Belum ada profil'}</p>
            ) : (
              <ul class="side-list">
                {profiles.map((p) => (
                  <li
                    key={p.id}
                    class={`side-item${p.id === activeId ? ' active' : ''}`}
                    title={`${p.name} · ${p.endpoint}`}
                    onClick={() => void selectProfile(p.id)}
                  >
                    <span class="side-ico">
                      <CloudIcon size={15} />
                    </span>
                    <span class="side-text">{p.name}</span>
                    {p.id === activeId ? <span class="side-dot" aria-label="aktif" /> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div class="side-section">
            <div class="side-head">Bucket</div>
            {buckets.length === 0 ? (
              <p class="side-empty">—</p>
            ) : (
              <ul class="side-list">
                {buckets.map((b) => (
                  <li
                    key={b}
                    class={`side-item${bucket === b && prefix === '' ? ' active' : ''}`}
                    title={b}
                    onClick={() => navigate({ bucket: b, prefix: '' })}
                  >
                    <span class="side-ico">
                      <FolderIcon size={15} />
                    </span>
                    <span class="side-text">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div class="sidebar-foot">
            <button type="button" class="side-foot-btn" onClick={() => setProfileModalOpen(true)}>
              <ServerIcon size={14} />
              <span>Kelola profil</span>
            </button>
          </div>
        </aside>

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
            view={view}
            onView={setView}
            canBack={nav.idx > 0}
            canForward={nav.idx < nav.stack.length - 1}
            onBack={goBack}
            onForward={goForward}
          />

          {dragOver ? <div class="drop-hint">Lepaskan file untuk upload</div> : null}

          <div class="bucketbar">
            <nav class="crumbs" aria-label="Breadcrumb">
              <button
                type="button"
                class="crumb-link root"
                onClick={() => bucket && navigate({ bucket, prefix: '' })}
              >
                s3://{bucket ?? '…'}
              </button>
              {crumbs.map((c) => (
                <span class="crumb" key={c.key}>
                  <span class="crumb-sep">/</span>
                  <button type="button" class="crumb-link" onClick={() => navigate({ bucket, prefix: c.key })}>
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
            view={view}
            selected={selected}
            onSelect={setSelected}
            onOpenFolder={(key) => navigate({ bucket, prefix: key })}
            onAction={onRowAction}
            onAddProfile={() => setProfileModalOpen(true)}
          />

          <footer class="statusbar">
            <span>
              {loading ? 'Memuat...' : `${filtered.length} item${selectedName ? ` · ${selectedName} dipilih` : ''}`}
            </span>
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
      </div>

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