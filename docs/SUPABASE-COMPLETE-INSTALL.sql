-- TutoDemy Learning PH — Complete Supabase Installation
-- Run this entire file only for a fresh project.
-- It installs the original account tables first, followed by the Tutor Marketplace upgrade.

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

-- TutoDemy Learning PH — Tutor Marketplace Upgrade
-- Safe to run after the original TutoDemy schema. It can also be rerun.
-- Run in Supabase SQL Editor using the project owner account.
--
-- IMPORTANT ADMIN STEP AFTER CREATING YOUR OWN ACCOUNT:
-- Replace the email below, uncomment the INSERT, and run it once.
-- insert into public.admin_users (user_id, note)
-- select id, 'Primary TutoDemy administrator' from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
-- on conflict (user_id) do nothing;

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Core account roles
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists role text not null default 'learner';
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

update public.profiles set role = 'learner' where role is null or role not in ('learner','tutor');
update public.profiles set account_status = 'active' where account_status is null;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_tutodemy_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_tutodemy_admin() from public;
grant execute on function public.is_tutodemy_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Tutor profiles, availability, and private verification records
-- ---------------------------------------------------------------------------

create table if not exists public.tutor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  contact_email text not null default '',
  headline text not null default '',
  bio text not null default '',
  subjects text[] not null default '{}'::text[],
  exam_specializations text[] not null default '{}'::text[],
  grade_levels text[] not null default '{}'::text[],
  teaching_modes text[] not null default '{}'::text[],
  city text not null default '',
  province text not null default '',
  service_area text not null default '',
  hourly_rate numeric(10,2) not null default 0 check (hourly_rate >= 0),
  session_duration_minutes integer not null default 60 check (session_duration_minutes between 30 and 240),
  availability_summary text not null default '',
  timezone text not null default 'Asia/Manila',
  profile_photo_path text,
  education text not null default '',
  credentials_summary text not null default '',
  years_experience numeric(5,1) not null default 0 check (years_experience >= 0),
  languages text[] not null default '{}'::text[],
  status text not null default 'draft',
  rejection_reason text not null default '',
  is_accepting_bookings boolean not null default false,
  founding_eligible boolean not null default false,
  founding_approved_at timestamptz,
  completed_sessions integer not null default 0,
  average_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  cancellation_rate numeric(5,2) not null default 0,
  account_standing text not null default 'good',
  commission_tier text not null default 'regular',
  current_commission_rate numeric(5,2) not null default 15,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_status_check check (status in ('draft','pending','approved','rejected','suspended')),
  constraint tutor_standing_check check (account_standing in ('good','review','suspended')),
  constraint tutor_commission_tier_check check (commission_tier in ('founding','regular','high_volume','top_rated'))
);

create table if not exists public.tutor_availability (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  mode text not null check (mode in ('Online','In-person','Either')),
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_time_check check (end_time > start_time)
);

create table if not exists public.tutor_documents (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  original_name text not null default '',
  verification_status text not null default 'pending',
  admin_note text not null default '',
  uploaded_at timestamptz not null default now(),
  constraint tutor_document_status_check check (verification_status in ('pending','verified','rejected'))
);

create index if not exists tutor_profiles_status_idx on public.tutor_profiles(status, is_accepting_bookings);
create index if not exists tutor_profiles_subjects_idx on public.tutor_profiles using gin(subjects);
create index if not exists tutor_availability_tutor_idx on public.tutor_availability(tutor_id, day_of_week);
create index if not exists tutor_documents_tutor_idx on public.tutor_documents(tutor_id, uploaded_at desc);

-- ---------------------------------------------------------------------------
-- Bookings, reviews, and commission ledger
-- ---------------------------------------------------------------------------

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete restrict,
  learner_name_snapshot text not null default '',
  tutor_name_snapshot text not null default '',
  requested_start timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 30 and 240),
  mode text not null check (mode in ('Online','In-person')),
  subject text not null,
  learning_goal text not null default '',
  location_details text not null default '',
  hourly_rate_snapshot numeric(10,2) not null check (hourly_rate_snapshot >= 0),
  gross_amount numeric(10,2) not null check (gross_amount >= 0),
  status text not null default 'requested',
  payment_status text not null default 'unpaid',
  payment_method text not null default '',
  payment_reference text not null default '',
  tutor_response_note text not null default '',
  learner_note text not null default '',
  admin_note text not null default '',
  commission_rate numeric(5,2),
  commission_amount numeric(10,2),
  tutor_net_amount numeric(10,2),
  commission_tier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  paid_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  constraint booking_status_check check (status in ('requested','accepted','declined','cancelled','paid','session_delivered','completed','refunded','disputed')),
  constraint payment_status_check check (payment_status in ('unpaid','pending','paid','refunded')),
  constraint different_booking_parties check (learner_id <> tutor_id)
);

alter table public.bookings add column if not exists learner_name_snapshot text not null default '';
alter table public.bookings add column if not exists tutor_name_snapshot text not null default '';

create table if not exists public.tutor_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text not null default '',
  status text not null default 'published',
  created_at timestamptz not null default now(),
  constraint tutor_review_status_check check (status in ('published','hidden'))
);

create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete restrict,
  gross_amount numeric(10,2) not null,
  commission_rate numeric(5,2) not null,
  commission_amount numeric(10,2) not null,
  tutor_net_amount numeric(10,2) not null,
  commission_tier text not null,
  created_at timestamptz not null default now()
);

create index if not exists bookings_learner_idx on public.bookings(learner_id, created_at desc);
create index if not exists bookings_tutor_idx on public.bookings(tutor_id, requested_start desc);
create index if not exists bookings_status_idx on public.bookings(status, payment_status);
create index if not exists tutor_reviews_tutor_idx on public.tutor_reviews(tutor_id, created_at desc);
create index if not exists commission_ledger_tutor_idx on public.commission_ledger(tutor_id, created_at desc);

-- Public-safe directory views intentionally exclude private contact details,
-- application decisions, administrator notes, learner IDs, and booking IDs.
create or replace view public.public_tutor_profiles
with (security_barrier = true)
as
select
  user_id,
  display_name,
  headline,
  bio,
  subjects,
  exam_specializations,
  grade_levels,
  teaching_modes,
  city,
  province,
  service_area,
  hourly_rate,
  session_duration_minutes,
  availability_summary,
  timezone,
  profile_photo_path,
  education,
  credentials_summary,
  years_experience,
  languages,
  is_accepting_bookings,
  completed_sessions,
  average_rating,
  review_count,
  approved_at
from public.tutor_profiles
where status = 'approved' and account_standing = 'good';

create or replace view public.public_tutor_reviews
with (security_barrier = true)
as
select
  id,
  tutor_id,
  rating,
  review_text,
  created_at
from public.tutor_reviews
where status = 'published';

create or replace function public.is_public_tutor(p_tutor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tutor_profiles p
    where p.user_id = p_tutor_id
      and p.status = 'approved'
      and p.account_standing = 'good'
  );
$$;

-- ---------------------------------------------------------------------------
-- Shared helper functions and protected-column trigger
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_tutor_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user not in ('postgres','service_role','supabase_admin') and not public.is_tutodemy_admin() then
    if tg_op = 'INSERT' then
      new.status := 'draft';
      new.rejection_reason := '';
      new.is_accepting_bookings := false;
      new.founding_eligible := false;
      new.founding_approved_at := null;
      new.completed_sessions := 0;
      new.average_rating := 0;
      new.review_count := 0;
      new.cancellation_rate := 0;
      new.account_standing := 'good';
      new.commission_tier := 'regular';
      new.current_commission_rate := 15;
      new.approved_at := null;
    else
      new.status := old.status;
      new.rejection_reason := old.rejection_reason;
      new.is_accepting_bookings := old.is_accepting_bookings;
      new.founding_eligible := old.founding_eligible;
      new.founding_approved_at := old.founding_approved_at;
      new.completed_sessions := old.completed_sessions;
      new.average_rating := old.average_rating;
      new.review_count := old.review_count;
      new.cancellation_rate := old.cancellation_rate;
      new.account_standing := old.account_standing;
      new.commission_tier := old.commission_tier;
      new.current_commission_rate := old.current_commission_rate;
      new.approved_at := old.approved_at;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.refresh_tutor_commission_tier(p_tutor_id uuid)
returns table(tier text, rate numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.tutor_profiles%rowtype;
begin
  select * into p from public.tutor_profiles where user_id = p_tutor_id for update;
  if not found then raise exception 'Tutor profile not found.'; end if;

  if p.founding_eligible and p.completed_sessions < 20 then
    tier := 'founding'; rate := 10;
  elsif p.completed_sessions >= 100 and p.average_rating >= 4.50 and p.account_standing = 'good' then
    tier := 'high_volume'; rate := 12;
  elsif p.completed_sessions >= 50 and p.average_rating >= 4.80 and p.review_count >= 20 and p.cancellation_rate <= 5 and p.account_standing = 'good' then
    tier := 'top_rated'; rate := 12;
  else
    tier := 'regular'; rate := 15;
  end if;

  update public.tutor_profiles
    set commission_tier = tier,
        current_commission_rate = rate,
        updated_at = now()
    where user_id = p_tutor_id;

  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Marketplace actions
-- ---------------------------------------------------------------------------

create or replace function public.submit_tutor_application()
returns public.tutor_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result public.tutor_profiles;
begin
  if uid is null then raise exception 'You must be logged in.'; end if;

  select * into result from public.tutor_profiles where user_id = uid for update;
  if not found then raise exception 'Save your tutor profile before submitting.'; end if;
  if trim(result.display_name) = '' or trim(result.contact_email) = '' or trim(result.bio) = '' then
    raise exception 'Display name, contact email, and bio are required.';
  end if;
  if cardinality(result.subjects) = 0 or cardinality(result.teaching_modes) = 0 then
    raise exception 'Select at least one subject and teaching mode.';
  end if;
  if result.hourly_rate <= 0 then raise exception 'Enter a valid tutoring rate.'; end if;

  update public.tutor_profiles
    set status = 'pending', submitted_at = now(), rejection_reason = '', updated_at = now()
    where user_id = uid
    returning * into result;

  update public.profiles set role = 'tutor', updated_at = now() where id = uid;
  return result;
end;
$$;

create or replace function public.tutor_set_accepting_bookings(p_accepting boolean)
returns public.tutor_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result public.tutor_profiles;
begin
  select * into result from public.tutor_profiles where user_id=uid for update;
  if not found then raise exception 'Tutor profile not found.'; end if;
  if result.status <> 'approved' or result.account_standing <> 'good' then
    raise exception 'Only approved tutors in good standing can change booking availability.';
  end if;
  update public.tutor_profiles set is_accepting_bookings=p_accepting, updated_at=now()
  where user_id=uid returning * into result;
  return result;
end;
$$;

create or replace function public.create_booking_request(
  p_tutor_id uuid,
  p_requested_start timestamptz,
  p_duration_minutes integer,
  p_mode text,
  p_subject text,
  p_learning_goal text default '',
  p_location_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  tutor public.tutor_profiles%rowtype;
  learner_name text := '';
  booking_id uuid;
  amount numeric(10,2);
begin
  if uid is null then raise exception 'Log in before requesting a booking.'; end if;
  if uid = p_tutor_id then raise exception 'You cannot book your own tutor profile.'; end if;
  if p_requested_start <= now() then raise exception 'Choose a future schedule.'; end if;
  if p_duration_minutes < 30 or p_duration_minutes > 240 then raise exception 'Session duration must be 30 to 240 minutes.'; end if;
  if p_mode not in ('Online','In-person') then raise exception 'Choose Online or In-person.'; end if;
  if trim(coalesce(p_subject,'')) = '' then raise exception 'Choose or enter a subject.'; end if;
  if p_mode = 'In-person' and trim(coalesce(p_location_details,'')) = '' then
    raise exception 'Add the proposed in-person location or meeting area.';
  end if;

  select * into tutor from public.tutor_profiles
  where user_id = p_tutor_id and status = 'approved' and account_standing = 'good' and is_accepting_bookings = true;
  if not found then raise exception 'This tutor is not currently accepting bookings.'; end if;
  if not (p_mode = any(tutor.teaching_modes) or 'Either' = any(tutor.teaching_modes)) then
    raise exception 'The selected teaching mode is not offered by this tutor.';
  end if;

  amount := round((tutor.hourly_rate * p_duration_minutes::numeric / 60), 2);
  select coalesce(full_name,'') into learner_name from public.profiles where id=uid;
  insert into public.bookings (
    learner_id,tutor_id,learner_name_snapshot,tutor_name_snapshot,requested_start,duration_minutes,mode,subject,learning_goal,
    location_details,hourly_rate_snapshot,gross_amount,status,payment_status
  ) values (
    uid,p_tutor_id,learner_name,tutor.display_name,p_requested_start,p_duration_minutes,p_mode,trim(p_subject),
    trim(coalesce(p_learning_goal,'')),trim(coalesce(p_location_details,'')),
    tutor.hourly_rate,amount,'requested','unpaid'
  ) returning id into booking_id;
  return booking_id;
end;
$$;

create or replace function public.tutor_respond_booking(p_booking_id uuid, p_accept boolean, p_note text default '')
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result public.bookings;
begin
  if uid is null then raise exception 'You must be logged in.'; end if;
  select * into result from public.bookings where id = p_booking_id and tutor_id = uid for update;
  if not found then raise exception 'Booking not found.'; end if;
  if result.status <> 'requested' then raise exception 'This booking has already been processed.'; end if;
  if result.requested_start <= now() then raise exception 'The requested schedule has already passed.'; end if;

  if p_accept and exists (
    select 1
    from public.bookings other
    where other.tutor_id = uid
      and other.id <> p_booking_id
      and other.status in ('accepted','paid','session_delivered')
      and other.requested_start < result.requested_start + result.duration_minutes * interval '1 minute'
      and other.requested_start + other.duration_minutes * interval '1 minute' > result.requested_start
  ) then
    raise exception 'This schedule overlaps another active booking.';
  end if;

  update public.bookings
    set status = case when p_accept then 'accepted' else 'declined' end,
        tutor_response_note = trim(coalesce(p_note,'')),
        accepted_at = case when p_accept then now() else null end,
        updated_at = now()
    where id = p_booking_id
    returning * into result;
  return result;
end;
$$;

create or replace function public.learner_cancel_booking(p_booking_id uuid, p_note text default '')
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result public.bookings;
begin
  select * into result from public.bookings where id = p_booking_id and learner_id = uid for update;
  if not found then raise exception 'Booking not found.'; end if;
  if result.status not in ('requested','accepted') or result.payment_status <> 'unpaid' then
    raise exception 'This booking can no longer be cancelled from the learner dashboard.';
  end if;
  update public.bookings set status='cancelled', learner_note=trim(coalesce(p_note,'')), updated_at=now()
  where id=p_booking_id returning * into result;
  return result;
end;
$$;

create or replace function public.tutor_mark_session_delivered(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result public.bookings;
begin
  select * into result from public.bookings where id=p_booking_id and tutor_id=uid for update;
  if not found then raise exception 'Booking not found.'; end if;
  if result.status <> 'paid' or result.payment_status <> 'paid' then
    raise exception 'The booking must be payment-confirmed before delivery can be marked.';
  end if;
  update public.bookings set status='session_delivered', delivered_at=now(), updated_at=now()
  where id=p_booking_id returning * into result;
  return result;
end;
$$;

create or replace function public.admin_set_tutor_status(
  p_tutor_id uuid,
  p_status text,
  p_reason text default '',
  p_founding_eligible boolean default false
)
returns public.tutor_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.tutor_profiles;
begin
  if not public.is_tutodemy_admin() then raise exception 'Administrator access required.'; end if;
  if p_status not in ('draft','pending','approved','rejected','suspended') then raise exception 'Invalid tutor status.'; end if;

  update public.tutor_profiles
    set status = p_status,
        rejection_reason = trim(coalesce(p_reason,'')),
        founding_eligible = p_founding_eligible,
        founding_approved_at = case when p_founding_eligible and founding_approved_at is null then now() else founding_approved_at end,
        approved_at = case when p_status='approved' then coalesce(approved_at,now()) else approved_at end,
        is_accepting_bookings = case when p_status='approved' and account_standing='good' then true else false end,
        account_standing = case when p_status='suspended' then 'suspended' when account_standing='suspended' and p_status='approved' then 'good' else account_standing end,
        updated_at = now()
    where user_id = p_tutor_id
    returning * into result;
  if not found then raise exception 'Tutor profile not found.'; end if;

  update public.profiles set role='tutor', updated_at=now() where id=p_tutor_id;
  perform public.refresh_tutor_commission_tier(p_tutor_id);
  select * into result from public.tutor_profiles where user_id=p_tutor_id;
  return result;
end;
$$;

create or replace function public.admin_confirm_payment(
  p_booking_id uuid,
  p_payment_method text,
  p_payment_reference text
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare result public.bookings;
begin
  if not public.is_tutodemy_admin() then raise exception 'Administrator access required.'; end if;
  select * into result from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found.'; end if;
  if result.status <> 'accepted' then raise exception 'Only accepted bookings can be payment-confirmed.'; end if;
  update public.bookings
    set status='paid', payment_status='paid', payment_method=trim(coalesce(p_payment_method,'')),
        payment_reference=trim(coalesce(p_payment_reference,'')), paid_at=now(), updated_at=now()
    where id=p_booking_id returning * into result;
  return result;
end;
$$;

create or replace function public.admin_complete_booking(p_booking_id uuid, p_admin_note text default '')
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.bookings;
  rate numeric(5,2);
  tier text;
  fee numeric(10,2);
  net numeric(10,2);
begin
  if not public.is_tutodemy_admin() then raise exception 'Administrator access required.'; end if;
  select * into result from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found.'; end if;
  if result.status <> 'session_delivered' or result.payment_status <> 'paid' then
    raise exception 'A paid booking must be marked delivered before completion.';
  end if;

  select r.tier, r.rate into tier, rate from public.refresh_tutor_commission_tier(result.tutor_id) r;
  fee := round(result.gross_amount * rate / 100, 2);
  net := result.gross_amount - fee;

  update public.bookings
    set status='completed', completed_at=now(), admin_note=trim(coalesce(p_admin_note,'')),
        commission_rate=rate, commission_amount=fee, tutor_net_amount=net,
        commission_tier=tier, updated_at=now()
    where id=p_booking_id returning * into result;

  insert into public.commission_ledger (
    booking_id,tutor_id,gross_amount,commission_rate,commission_amount,tutor_net_amount,commission_tier
  ) values (result.id,result.tutor_id,result.gross_amount,rate,fee,net,tier)
  on conflict (booking_id) do nothing;

  update public.tutor_profiles
    set completed_sessions=completed_sessions+1, updated_at=now()
    where user_id=result.tutor_id;
  perform public.refresh_tutor_commission_tier(result.tutor_id);
  return result;
end;
$$;

create or replace function public.submit_tutor_review(
  p_booking_id uuid,
  p_rating integer,
  p_review_text text default ''
)
returns public.tutor_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bookings%rowtype;
  result public.tutor_reviews;
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5.'; end if;
  select * into b from public.bookings where id=p_booking_id and learner_id=uid and status='completed';
  if not found then raise exception 'Only the learner from a completed booking can review this tutor.'; end if;

  insert into public.tutor_reviews (booking_id,learner_id,tutor_id,rating,review_text)
  values (b.id,uid,b.tutor_id,p_rating,trim(coalesce(p_review_text,'')))
  returning * into result;

  update public.tutor_profiles p
    set review_count = s.review_count,
        average_rating = s.average_rating,
        updated_at = now()
    from (
      select tutor_id, count(*)::integer as review_count, round(avg(rating)::numeric,2) as average_rating
      from public.tutor_reviews where tutor_id=b.tutor_id and status='published' group by tutor_id
    ) s
    where p.user_id=s.tutor_id;
  perform public.refresh_tutor_commission_tier(b.tutor_id);
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists tutor_profiles_protected_fields on public.tutor_profiles;
create trigger tutor_profiles_protected_fields
before insert or update on public.tutor_profiles
for each row execute function public.protect_tutor_profile_fields();

drop trigger if exists tutor_availability_touch on public.tutor_availability;
create trigger tutor_availability_touch
before update on public.tutor_availability
for each row execute function public.touch_updated_at();

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch
before update on public.bookings
for each row execute function public.touch_updated_at();

-- Upgrade the account-creation trigger to include role safely.
create or replace function public.handle_new_tutodemy_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare selected_role text;
begin
  selected_role := case when new.raw_user_meta_data ->> 'role' = 'tutor' then 'tutor' else 'learner' end;
  insert into public.profiles (id, full_name, student_level, target_exam, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'student_level', ''),
    coalesce(new.raw_user_meta_data ->> 'target_exam', ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'avatar_url', ''), ''),
    selected_role
  )
  on conflict (id) do update set
    full_name=excluded.full_name,
    student_level=excluded.student_level,
    target_exam=excluded.target_exam,
    avatar_url=coalesce(excluded.avatar_url,public.profiles.avatar_url),
    role=excluded.role,
    updated_at=now();
  return new;
end;
$$;

drop trigger if exists on_tutodemy_user_created on auth.users;
create trigger on_tutodemy_user_created
after insert on auth.users
for each row execute function public.handle_new_tutodemy_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.tutor_profiles enable row level security;
alter table public.tutor_availability enable row level security;
alter table public.tutor_documents enable row level security;
alter table public.bookings enable row level security;
alter table public.tutor_reviews enable row level security;
alter table public.commission_ledger enable row level security;

-- Profiles: replace the original broad policy with own-profile and admin policies.
drop policy if exists "Learners manage their own profile" on public.profiles;
drop policy if exists "Users view their own profile" on public.profiles;
drop policy if exists "Users insert their own profile" on public.profiles;
drop policy if exists "Users update their own profile" on public.profiles;
drop policy if exists "Admins view profiles" on public.profiles;
create policy "Users view their own profile" on public.profiles for select to authenticated
  using ((select auth.uid())=id or public.is_tutodemy_admin());
create policy "Users insert their own profile" on public.profiles for insert to authenticated
  with check ((select auth.uid())=id);
create policy "Users update their own profile" on public.profiles for update to authenticated
  using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "Admins view profiles" on public.profiles for select to authenticated
  using (public.is_tutodemy_admin());

-- Admin list.
drop policy if exists "Admins view admin list" on public.admin_users;
create policy "Admins view admin list" on public.admin_users for select to authenticated
  using (public.is_tutodemy_admin());

-- Tutor profiles.
drop policy if exists "Public view approved tutors" on public.tutor_profiles;
drop policy if exists "Tutors view own profile" on public.tutor_profiles;
drop policy if exists "Tutors insert own profile" on public.tutor_profiles;
drop policy if exists "Tutors update own profile" on public.tutor_profiles;
drop policy if exists "Admins manage tutor profiles" on public.tutor_profiles;
create policy "Tutors view own profile" on public.tutor_profiles for select to authenticated
  using ((select auth.uid())=user_id or public.is_tutodemy_admin());
create policy "Tutors insert own profile" on public.tutor_profiles for insert to authenticated
  with check ((select auth.uid())=user_id);
create policy "Tutors update own profile" on public.tutor_profiles for update to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Admins manage tutor profiles" on public.tutor_profiles for all to authenticated
  using (public.is_tutodemy_admin()) with check (public.is_tutodemy_admin());

-- Availability.
drop policy if exists "Public view approved tutor availability" on public.tutor_availability;
drop policy if exists "Tutors manage own availability" on public.tutor_availability;
drop policy if exists "Admins manage availability" on public.tutor_availability;
create policy "Public view approved tutor availability" on public.tutor_availability for select to anon, authenticated
  using (public.is_public_tutor(tutor_id));
create policy "Tutors manage own availability" on public.tutor_availability for all to authenticated
  using ((select auth.uid())=tutor_id) with check ((select auth.uid())=tutor_id);
create policy "Admins manage availability" on public.tutor_availability for all to authenticated
  using (public.is_tutodemy_admin()) with check (public.is_tutodemy_admin());

-- Private documents.
drop policy if exists "Tutors view own documents" on public.tutor_documents;
drop policy if exists "Tutors upload own documents" on public.tutor_documents;
drop policy if exists "Tutors delete own pending documents" on public.tutor_documents;
drop policy if exists "Admins manage tutor documents" on public.tutor_documents;
create policy "Tutors view own documents" on public.tutor_documents for select to authenticated
  using ((select auth.uid())=tutor_id or public.is_tutodemy_admin());
create policy "Tutors upload own documents" on public.tutor_documents for insert to authenticated
  with check ((select auth.uid())=tutor_id);
create policy "Tutors delete own pending documents" on public.tutor_documents for delete to authenticated
  using ((select auth.uid())=tutor_id and verification_status='pending');
create policy "Admins manage tutor documents" on public.tutor_documents for all to authenticated
  using (public.is_tutodemy_admin()) with check (public.is_tutodemy_admin());

-- Bookings are mutated only through checked RPC functions.
drop policy if exists "Booking parties view bookings" on public.bookings;
drop policy if exists "Admins view bookings" on public.bookings;
create policy "Booking parties view bookings" on public.bookings for select to authenticated
  using ((select auth.uid())=learner_id or (select auth.uid())=tutor_id or public.is_tutodemy_admin());
create policy "Admins view bookings" on public.bookings for select to authenticated
  using (public.is_tutodemy_admin());

-- Reviews.
drop policy if exists "Public view published reviews" on public.tutor_reviews;
drop policy if exists "Learners view own reviews" on public.tutor_reviews;
drop policy if exists "Admins manage reviews" on public.tutor_reviews;
create policy "Learners view own reviews" on public.tutor_reviews for select to authenticated
  using ((select auth.uid())=learner_id or (select auth.uid())=tutor_id or public.is_tutodemy_admin());
create policy "Admins manage reviews" on public.tutor_reviews for all to authenticated
  using (public.is_tutodemy_admin()) with check (public.is_tutodemy_admin());

-- Commission ledger.
drop policy if exists "Tutors view own commission ledger" on public.commission_ledger;
drop policy if exists "Admins view commission ledger" on public.commission_ledger;
create policy "Tutors view own commission ledger" on public.commission_ledger for select to authenticated
  using ((select auth.uid())=tutor_id or public.is_tutodemy_admin());
create policy "Admins view commission ledger" on public.commission_ledger for select to authenticated
  using (public.is_tutodemy_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets and policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('tutor-avatars','tutor-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('tutor-documents','tutor-documents',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

-- Drop only TutoDemy-named policies so reruns are safe.
drop policy if exists "Public read tutor avatars" on storage.objects;
drop policy if exists "Tutors upload own avatars" on storage.objects;
drop policy if exists "Tutors update own avatars" on storage.objects;
drop policy if exists "Tutors delete own avatars" on storage.objects;
drop policy if exists "Tutors read own private documents" on storage.objects;
drop policy if exists "Tutors upload own private documents" on storage.objects;
drop policy if exists "Tutors delete own private documents" on storage.objects;

create policy "Public read tutor avatars" on storage.objects for select to anon, authenticated
  using (bucket_id='tutor-avatars');
create policy "Tutors upload own avatars" on storage.objects for insert to authenticated
  with check (bucket_id='tutor-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Tutors update own avatars" on storage.objects for update to authenticated
  using (bucket_id='tutor-avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_tutodemy_admin()))
  with check (bucket_id='tutor-avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_tutodemy_admin()));
create policy "Tutors delete own avatars" on storage.objects for delete to authenticated
  using (bucket_id='tutor-avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_tutodemy_admin()));

create policy "Tutors read own private documents" on storage.objects for select to authenticated
  using (bucket_id='tutor-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_tutodemy_admin()));
create policy "Tutors upload own private documents" on storage.objects for insert to authenticated
  with check (bucket_id='tutor-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Tutors delete own private documents" on storage.objects for delete to authenticated
  using (bucket_id='tutor-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_tutodemy_admin()));

-- ---------------------------------------------------------------------------
-- Function execution permissions
-- ---------------------------------------------------------------------------

revoke all on function public.is_tutodemy_admin() from public;
revoke all on function public.is_public_tutor(uuid) from public;
revoke all on function public.refresh_tutor_commission_tier(uuid) from public;
revoke all on function public.submit_tutor_application() from public;
revoke all on function public.tutor_set_accepting_bookings(boolean) from public;
revoke all on function public.create_booking_request(uuid,timestamptz,integer,text,text,text,text) from public;
revoke all on function public.tutor_respond_booking(uuid,boolean,text) from public;
revoke all on function public.learner_cancel_booking(uuid,text) from public;
revoke all on function public.tutor_mark_session_delivered(uuid) from public;
revoke all on function public.admin_set_tutor_status(uuid,text,text,boolean) from public;
revoke all on function public.admin_confirm_payment(uuid,text,text) from public;
revoke all on function public.admin_complete_booking(uuid,text) from public;
revoke all on function public.submit_tutor_review(uuid,integer,text) from public;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.public_tutor_profiles to anon, authenticated;
grant select on public.public_tutor_reviews to anon, authenticated;
grant execute on function public.is_public_tutor(uuid) to anon, authenticated;
grant select on public.tutor_profiles to authenticated;
grant select on public.tutor_availability to anon, authenticated;
grant select on public.tutor_reviews to authenticated;
grant insert, update on public.tutor_profiles to authenticated;
grant select, insert, update, delete on public.tutor_availability to authenticated;
grant select, insert, delete on public.tutor_documents to authenticated;
grant select on public.bookings to authenticated;
grant select on public.commission_ledger to authenticated;
grant select on public.admin_users to authenticated;

grant execute on function public.submit_tutor_application() to authenticated;
grant execute on function public.tutor_set_accepting_bookings(boolean) to authenticated;
grant execute on function public.create_booking_request(uuid,timestamptz,integer,text,text,text,text) to authenticated;
grant execute on function public.tutor_respond_booking(uuid,boolean,text) to authenticated;
grant execute on function public.learner_cancel_booking(uuid,text) to authenticated;
grant execute on function public.tutor_mark_session_delivered(uuid) to authenticated;
grant execute on function public.admin_set_tutor_status(uuid,text,text,boolean) to authenticated;
grant execute on function public.admin_confirm_payment(uuid,text,text) to authenticated;
grant execute on function public.admin_complete_booking(uuid,text) to authenticated;
grant execute on function public.submit_tutor_review(uuid,integer,text) to authenticated;

commit;
