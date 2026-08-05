-- TutoDemy Learning PH
-- Supabase Auth + learner profile + cloud progress schema
-- Run this file in the Supabase SQL Editor.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  student_level text not null default '',
  target_exam text not null default '',
  school text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id text not null,
  completed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, attempt_id)
);

create table if not exists public.active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_reviewers (
  user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, reviewer_id)
);

create table if not exists public.tutor_inquiries (
  user_id uuid not null references auth.users(id) on delete cascade,
  inquiry_id text not null,
  submitted_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, inquiry_id)
);

create index if not exists exam_attempts_user_completed_idx
  on public.exam_attempts (user_id, completed_at desc);
create index if not exists saved_reviewers_user_idx
  on public.saved_reviewers (user_id);
create index if not exists tutor_inquiries_user_submitted_idx
  on public.tutor_inquiries (user_id, submitted_at desc);

alter table public.profiles enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.active_sessions enable row level security;
alter table public.saved_reviewers enable row level security;
alter table public.tutor_inquiries enable row level security;

-- Recreate policies safely when the script is rerun.
drop policy if exists "Learners manage their own profile" on public.profiles;
drop policy if exists "Learners manage their own attempts" on public.exam_attempts;
drop policy if exists "Learners manage their own active session" on public.active_sessions;
drop policy if exists "Learners manage their own saved reviewers" on public.saved_reviewers;
drop policy if exists "Learners manage their own tutor inquiries" on public.tutor_inquiries;

create policy "Learners manage their own profile"
  on public.profiles
  for all
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Learners manage their own attempts"
  on public.exam_attempts
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Learners manage their own active session"
  on public.active_sessions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Learners manage their own saved reviewers"
  on public.saved_reviewers
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Learners manage their own tutor inquiries"
  on public.tutor_inquiries
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Create a profile automatically after email/password or OAuth signup.
create or replace function public.handle_new_tutodemy_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, student_level, target_exam, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'student_level', ''),
    coalesce(new.raw_user_meta_data ->> 'target_exam', ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'avatar_url', ''), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_tutodemy_user_created on auth.users;
create trigger on_tutodemy_user_created
  after insert on auth.users
  for each row execute function public.handle_new_tutodemy_user();

-- Data API permissions. RLS still decides which rows are accessible.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.exam_attempts to authenticated;
grant select, insert, update, delete on public.active_sessions to authenticated;
grant select, insert, update, delete on public.saved_reviewers to authenticated;
grant select, insert, update, delete on public.tutor_inquiries to authenticated;

commit;
