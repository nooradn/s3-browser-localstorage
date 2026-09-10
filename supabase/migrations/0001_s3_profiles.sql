-- S3 Browser — penyimpanan multi-profil S3 di Supabase (bukan localStorage)
-- Jalankan di Supabase Dashboard → SQL Editor (atau `supabase db push`).
-- RLS aktif: setiap user hanya bisa mengakses profil miliknya sendiri.

-- ============================================================
-- 1. Tabel profil S3
-- ============================================================

create table public.s3_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  endpoint text not null check (char_length(endpoint) <= 2048),
  region text not null default 'auto',
  access_key_id text not null,
  secret_access_key text not null,
  force_path_style boolean not null default true,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.s3_profiles is
  'Profil koneksi S3 per user. Secret key disimpan apa adanya — untuk produksi gunakan enkripsi (mis. client-side AES-GCM) atau Supabase Vault/pgodium.';

comment on column public.s3_profiles.secret_access_key is
  'SECRET — jangan expose ke client lain; lindungi via RLS.';

-- ============================================================
-- 2. Satu profil aktif per user
-- ============================================================

create unique index s3_profiles_one_active_idx
  on public.s3_profiles (user_id)
  where is_active;

-- ============================================================
-- 3. Trigger updated_at
-- ============================================================

create or replace function public.s3_profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_s3_profiles_set_updated_at on public.s3_profiles;
create trigger trg_s3_profiles_set_updated_at
before update on public.s3_profiles
for each row execute function public.s3_profiles_set_updated_at();

-- ============================================================
-- 4. RLS + policy (hanya pemilik)
-- ============================================================

alter table public.s3_profiles enable row level security;

create policy "s3_profiles_select_own"
  on public.s3_profiles
  for select to authenticated
  using (auth.uid() = user_id);

create policy "s3_profiles_insert_own"
  on public.s3_profiles
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "s3_profiles_update_own"
  on public.s3_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "s3_profiles_delete_own"
  on public.s3_profiles
  for delete to authenticated
  using (auth.uid() = user_id);

-- Grant eksplisit untuk role authenticated (RLS tetap membatasi per user)
grant select, insert, update, delete on public.s3_profiles to authenticated;

-- ============================================================
-- Contoh pemakaian dari app
-- ============================================================

-- Ambil semua profil user (RLS memfilter otomatis):
--   select id, name, endpoint, region, access_key_id, secret_access_key, force_path_style
--   from public.s3_profiles
--   where user_id = auth.uid();
--
-- Set profil aktif (hapus flag lama, nyalakan yang baru):
--   update public.s3_profiles
--   set is_active = (id = :profile_id)
--   where user_id = auth.uid();
--
-- Ambil profil aktif:
--   select * from public.s3_profiles
--   where user_id = auth.uid() and is_active;