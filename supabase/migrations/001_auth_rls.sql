alter table if exists assets add column if not exists user_id uuid references auth.users(id);
alter table if exists robo_advisors add column if not exists user_id uuid references auth.users(id);
alter table if exists portfolio_settings add column if not exists user_id uuid references auth.users(id);
