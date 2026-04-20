create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid references assets(id) on delete cascade,
  robo_advisor_id uuid references robo_advisors(id) on delete cascade,
  amount numeric not null,
  date date not null default current_date,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
