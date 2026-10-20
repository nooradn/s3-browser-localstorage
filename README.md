# S3 Browser

Web app untuk mengelola storage S3-compatible (AWS S3, MinIO, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, dsb.) lewat custom endpoint. Dibangun dengan Astro (SSR) + Preact, profil koneksi disimpan secara lokal di browser (`localStorage` / `sessionStorage`).

## Fitur

- Bebas autentikasi server/cloud — profil tersimpan di browser secara lokal
- Multi-profil koneksi S3 — simpan beberapa endpoint & kredensial, ganti cepat
- List bucket & jelajahi folder/objek (pagination berbasis `Delimiter: '/'`)
- Upload file, download/preview, rename, copy, move, hapus (file & folder rekursif), buat folder
- UI gelap/terang, responsif, bahasa Indonesia

## Cara kerja

- **Kredensial S3**: Disimpan di browser (`localStorage` / `sessionStorage`). Dikirim ke server per-request lewat header `x-s3-endpoint`, `x-s3-region`, `x-s3-access-key`, `x-s3-secret-key`, `x-s3-force-path-style`. Kredensial tidak pernah disimpan di server.
- **S3 client**: `@aws-sdk/client-s3` dibuat per-request (`src/lib/s3.ts`). `path-style` aktif secara default — cocok untuk sebagian besar custom endpoint.

## Persyaratan

- Node.js ≥ 20 (dikembangkan di Node 24)
- pnpm (atau npm/yarn)

## Setup

1. Install dependency:

   ```bash
   pnpm install
   ```

2. (Opsional) Duplikasi `.env.example` menjadi `.env`:

   ```bash
   cp .env.example .env
   ```

3. Jalankan:

   ```bash
   pnpm dev        # develop (http://localhost:4321)
   pnpm build      # build production
   pnpm preview    # preview hasil build
   pnpm check      # type-check (astro check)
   ```

## API

Kredensial S3 dikirim via header per request (`x-s3-*`).

| Method | Path                                     | Fungsi                                           |
| ------ | ---------------------------------------- | ------------------------------------------------ |
| GET    | `/api/s3/buckets`                        | Daftar bucket                                    |
| GET    | `/api/s3/objects?bucket=&prefix=`        | Daftar isi folder (objek + subfolder)            |
| GET    | `/api/s3/download?bucket=&key=&preview=` | Download / preview streaming file                |
| POST   | `/api/s3/upload`                         | Upload file (multipart: `bucket`, `key`, `file`) |
| POST   | `/api/s3/delete`                         | Hapus file / folder (rekursif)                   |
| POST   | `/api/s3/copy`                           | Copy / rename / move (file & folder)             |
| POST   | `/api/s3/mkdir`                          | Buat folder placeholder (`key/`)                 |

## Batasan

- Upload memakai PutObject (maks ±5 GB, file diproses in-memory).
- List folder satu halaman (MaxKeys 1000), tanpa pagination lanjutan.
- Kredensial S3 tersimpan di penyimpanan lokal browser.

## Struktur

```
src/
  lib/
    s3.ts          # klien & operasi S3
    s3req.ts       # ekstraksi kredensial dari header, wrapper error
    http.ts        # HttpError, json helpers
    client/        # api.ts, profiles.ts, format.ts (frontend)
  middleware.ts    # router middleware
  pages/
    api/s3/        # buckets, objects, download, upload, delete, copy, mkdir
    app.astro      # halaman utama
    index.astro    # redirect ke /app
```
