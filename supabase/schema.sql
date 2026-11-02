-- Run once in the Supabase SQL editor (Dashboard > SQL Editor).
create table if not exists public.mergee_data (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.mergee_data enable row level security;

drop policy if exists "own rows select" on public.mergee_data;
drop policy if exists "own rows insert" on public.mergee_data;
drop policy if exists "own rows update" on public.mergee_data;
drop policy if exists "own rows delete" on public.mergee_data;

-- user_id is compared as text so this also works when an older mergee_data table
-- already exists with user_id as text instead of uuid.
create policy "own rows select" on public.mergee_data for select using (auth.uid()::text = user_id::text);
create policy "own rows insert" on public.mergee_data for insert with check (auth.uid()::text = user_id::text);
create policy "own rows update" on public.mergee_data for update using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
create policy "own rows delete" on public.mergee_data for delete using (auth.uid()::text = user_id::text);

-- Storage buckets used for attachments (create as public buckets in Dashboard > Storage):
--   counseling-attachments, stack-library
