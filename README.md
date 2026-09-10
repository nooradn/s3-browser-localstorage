# S3 Browser

Web app untuk mengelola storage S3-compatible (AWS S3, MinIO, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, dsb.) lewat custom endpoint. Dibangun dengan Astro (SSR) + Preact, autentikasi memakai Supabase.

## Fitur

- Login/registrasi via Supabase Auth (email + password)
- Multi-profil koneksi S3 — simpan beberapa endpoint & kredensial, ganti cepat
- List bucket & jelajahi folder/objek (pagination berbasis `Delimiter: '/'`)
- Upload file, download/preview, rename, copy, move, hapus (file & folder rekursif), buat folder
- UI gelap, responsif, bahasa Indonesia

## Cara kerja

- **Auth**: login diproses server-side (`POST /api/auth/login`) memakai `@supabase/supabase-js`. Sesi disimpan di `httpOnly` cookie (`sb_access_token`, `sb_refresh_token`). Middleware melindungi `/app` dan seluruh `/api/s3/*`.
- **Kredensial S3**: TIDAK pernah disimpan di server. Dikirim client per-request lewat header `x-s3-endpoint`, `x-s3-region`, `x-s3-access-key`, `x-s3-secret-key`, `x-s3-force-path-style`. Profil disimpan di `localStorage` browser.
- **S3 client**: `@aws-sdk/client-s3` dibuat per-request (`src/lib/s3.ts`). `path-style` aktif secara default — cocok untuk sebagian besar custom endpoint.

## Persyaratan

- Node.js ≥ 20 (dikembangkan di Node 24)
- pnpm (atau npm/yarn)
- Proyek Supabase: https://supabase.com

## Setup

1. Install dependency:

   ```bash
   pnpm install
   ```

2. Duplikasi `.env.example` menjadi `.env` dan isi:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_xxxx
   ```

3. (Opsional) Pasang adapter Node untuk mode production:

   ```bash
   pnpm approve-builds esbuild
   ```

4. Jalankan:

   ```bash
   pnpm dev        # develop (http://localhost:4321)
   pnpm build      # build production
   pnpm preview    # preview hasil build
   pnpm start      # jalankan standalone (node ./dist/server/entry.mjs)
   pnpm check      # type-check (astro check)
   ```

> Catatan Supabase: aktifkan **Email provider** di Dashboard → Authentication → Sign In / Up agar user baru bisa registrasi. Autentikasi lain (Magic Link, OAuth) bisa ditambahkan di `src/pages/api/auth/login.ts`.

## API

Semua endpoint `/api/s3/*` butuh sesi login. Kredensial S3 dikirim via header per request (`x-s3-*`).

| Method | Path                          | Fungsi                                          |
| ------ | ----------------------------- | ----------------------------------------------- |
| POST   | `/api/auth/login`             | Login, set cookie sesi                          |
| POST   | `/api/auth/logout`            | Hapus cookie sesi                               |
| GET    | `/api/auth/session`           | Status sesi (`{ user }`)                        |
| GET    | `/api/s3/buckets`             | Daftar bucket                                   |
| GET    | `/api/s3/objects?bucket=&prefix=` | Daftar isi folder (objek + subfolder)       |
| GET    | `/api/s3/download?bucket=&key=&preview=` | Download / preview streaming file    |
| POST   | `/api/s3/upload`              | Upload file (multipart: `bucket`, `key`, `file`) |
| POST   | `/api/s3/delete`              | Hapus file / folder (rekursif)                 |
| POST   | `/api/s3/copy`                | Copy / rename / move (file & folder)           |
| POST   | `/api/s3/mkdir`               | Buat folder placeholder (`key/`)               |

## Batasan

- Upload memakai PutObject (maks ±5 GB, file diproses in-memory).
- List folder satu halaman (MaxKeys 1000), tanpa pagination lanjutan.
- Kredensial S3 disimpan di localStorage — jangan pakai akun dengan akses berlebihan untuk penggunaan publik.

## Struktur

```
src/
  lib/
    s3.ts          # klien & operasi S3
    s3req.ts       # ekstraksi kredensial dari header, wrapper error
    supabase.ts    # sesi Supabase + cookie
    http.ts        # HttpError, json helpers
    client/        # api.ts, profiles.ts, format.ts (frontend)
  middleware.ts    # guard /app & /api/s3/*
  pages/
    api/auth/      # login, logout, session
    api/s3/        # buckets, objects, download, upload, delete, copy, mkdir
    login.astro    # halaman login
    app.astro      # halaman utama
    index.astro    # redirect ke /app
  components/
    auth/Login.tsx
    s3/FileBrowser.tsx, FileTable.tsx, Toolbar.tsx, ProfileModal.tsx,
       CopyMoveModal.tsx, Modal.tsx, PromptModal.tsx, ConfirmModal.tsx, Icons.tsx
  styles/global.css
```