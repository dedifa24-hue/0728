create table if not exists public.lotto_draws (
  id bigint primary key generated always as identity,
  visitor_id uuid not null,
  numbers smallint[] not null,
  source text not null default 'random',
  created_at timestamptz not null default now(),
  constraint lotto_draws_six_numbers check (cardinality(numbers) = 6),
  constraint lotto_draws_number_range check (
    0 < all(numbers) and 46 > all(numbers)
  ),
  constraint lotto_draws_source check (source in ('random', 'fortune'))
);

create index if not exists lotto_draws_visitor_created_idx
  on public.lotto_draws (visitor_id, created_at desc);

alter table public.lotto_draws enable row level security;

grant select, insert, delete on table public.lotto_draws to anon;
grant usage, select on sequence public.lotto_draws_id_seq to anon;

create policy "anonymous visitors can read lotto draws"
  on public.lotto_draws for select to anon
  using (true);

create policy "anonymous visitors can insert lotto draws"
  on public.lotto_draws for insert to anon
  with check (
    cardinality(numbers) = 6
    and source in ('random', 'fortune')
  );

create policy "anonymous visitors can delete lotto draws"
  on public.lotto_draws for delete to anon
  using (true);
