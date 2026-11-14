-- Kor veritabanı şeması (Supabase / Postgres).
-- Supabase panelinde SQL Editor'e yapıştırıp bir kez çalıştırılır. Tekrar çalıştırmak güvenlidir.
--
-- Güvenlik modeli:
--   * Her tabloda satır düzeyi güvenlik (RLS) açık. Tarayıcıdaki "anon" anahtarı herkese
--     açıktır; korumayı anahtar değil bu kurallar sağlar.
--   * Kullanıcı yalnızca kendi satırını okur ve yazar.
--   * Abonelik durumu (subscriptions) tarayıcıdan yazılamaz. Onu yalnızca ödeme
--     sağlayıcısının webhook'u (service_role anahtarıyla, sunucuda) ve start_trial() yazar.

-- ---------------------------------------------------------------------------
-- 1) Kullanıcı verisi: uygulamanın tüm durumu tek JSON belgesi olarak yedeklenir.
-- ---------------------------------------------------------------------------
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  -- Tek kullanıcının depolamayı şişirmesini engeller (yaklaşık 5 MB).
  constraint user_data_size check (pg_column_size(data) < 5 * 1024 * 1024)
);

alter table public.user_data enable row level security;

drop policy if exists "user_data: kendi satırını oku" on public.user_data;
create policy "user_data: kendi satırını oku" on public.user_data
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_data: kendi satırını ekle" on public.user_data;
create policy "user_data: kendi satırını ekle" on public.user_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_data: kendi satırını güncelle" on public.user_data;
create policy "user_data: kendi satırını güncelle" on public.user_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- updated_at'i sunucu saatiyle damgala; istemcinin gönderdiği değere güvenme.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch
  before insert or update on public.user_data
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Abonelik: Premium hakkının tek doğru kaynağı.
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id                  uuid primary key references auth.users (id) on delete cascade,
  status                   text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  plan                     text check (plan in ('monthly', 'yearly')),
  price_tier               text check (price_tier in ('tr', 'high', 'low')),
  provider                 text,
  provider_subscription_id text,
  trial_used               boolean not null default false,
  current_period_end       timestamptz not null,
  updated_at               timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Yalnızca okuma. insert/update/delete kuralı bilerek yok: tarayıcı kendine Premium yazamaz.
drop policy if exists "subscriptions: kendi satırını oku" on public.subscriptions;
create policy "subscriptions: kendi satırını oku" on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch
  before insert or update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- 7 günlük ücretsiz deneme: hesap başına bir kez, kart istemeden.
create or replace function public.start_trial()
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  row public.subscriptions;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.subscriptions s where s.user_id = uid) then
    raise exception 'trial_used';
  end if;
  insert into public.subscriptions (user_id, status, trial_used, current_period_end)
  values (uid, 'trialing', true, now() + interval '7 days')
  returning * into row;
  return row;
end;
$$;

revoke all on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Hesap silme: kullanıcı kendi hesabını ve tüm verisini kalıcı olarak siler.
--    (user_data ve subscriptions satırları "on delete cascade" ile birlikte gider.)
-- ---------------------------------------------------------------------------
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Sıralama: katılmayı seçen kullanıcının görünen adı ve genel RP'si.
--    Giriş yapmış herkes okur; herkes yalnızca kendi satırını yazar ve siler.
--    RP'yi uygulama bildirir, sunucu kaldırışı doğrulamaz: yalnızca aralık denetlenir.
--    Hesap silinince satır "on delete cascade" ile gider.
-- ---------------------------------------------------------------------------
create table if not exists public.leaderboard (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 24),
  rp         integer not null check (rp between 0 and 2400),
  updated_at timestamptz not null default now()
);

create index if not exists leaderboard_rp_idx on public.leaderboard (rp desc);

alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard: giriş yapan okur" on public.leaderboard;
create policy "leaderboard: giriş yapan okur" on public.leaderboard
  for select to authenticated
  using (true);

drop policy if exists "leaderboard: kendi satırını ekle" on public.leaderboard;
create policy "leaderboard: kendi satırını ekle" on public.leaderboard
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaderboard: kendi satırını güncelle" on public.leaderboard;
create policy "leaderboard: kendi satırını güncelle" on public.leaderboard
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaderboard: kendi satırını sil" on public.leaderboard;
create policy "leaderboard: kendi satırını sil" on public.leaderboard
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists leaderboard_touch on public.leaderboard;
create trigger leaderboard_touch
  before insert or update on public.leaderboard
  for each row execute function public.touch_updated_at();
