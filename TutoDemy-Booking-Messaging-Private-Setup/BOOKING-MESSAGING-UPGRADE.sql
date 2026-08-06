-- TutoDemy Learning PH — Private Booking Messaging Upgrade
-- Run once in Supabase SQL Editor after the Tutor Marketplace upgrade.
-- Safe to rerun. This script adds booking-specific messages, read tracking,
-- conversation reports, administrator review, and realtime subscriptions.

begin;

create extension if not exists pgcrypto;

create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  message_type text not null default 'text',
  body text not null,
  created_at timestamptz not null default now(),
  constraint booking_message_type_check check (message_type in ('text','system')),
  constraint booking_message_body_check check (char_length(trim(body)) between 1 and 2000)
);

create table if not exists public.booking_message_reads (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);

create table if not exists public.booking_message_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reported_message_id uuid references public.booking_messages(id) on delete set null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'open',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  constraint message_report_reason_check check (char_length(trim(reason)) between 2 and 120),
  constraint message_report_details_check check (char_length(details) <= 1500),
  constraint message_report_status_check check (status in ('open','reviewing','resolved','dismissed'))
);

create index if not exists booking_messages_booking_created_idx
  on public.booking_messages(booking_id, created_at, id);
create index if not exists booking_message_reads_user_idx
  on public.booking_message_reads(user_id, last_read_at desc);
create index if not exists booking_message_reports_status_idx
  on public.booking_message_reports(status, created_at desc);

alter table public.booking_messages enable row level security;
alter table public.booking_message_reads enable row level security;
alter table public.booking_message_reports enable row level security;

create or replace function public.can_access_booking_conversation(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and (
        b.learner_id = (select auth.uid())
        or b.tutor_id = (select auth.uid())
        or public.is_tutodemy_admin()
      )
  );
$$;

create or replace function public.can_send_booking_message(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and (
        public.is_tutodemy_admin()
        or (
          (b.learner_id = (select auth.uid()) or b.tutor_id = (select auth.uid()))
          and b.status in ('accepted','paid','session_delivered','completed','disputed')
        )
      )
  );
$$;

revoke all on function public.can_access_booking_conversation(uuid) from public;
revoke all on function public.can_send_booking_message(uuid) from public;
grant execute on function public.can_access_booking_conversation(uuid) to authenticated;
grant execute on function public.can_send_booking_message(uuid) to authenticated;

drop policy if exists "Booking parties read messages" on public.booking_messages;
create policy "Booking parties read messages"
on public.booking_messages
for select
to authenticated
using (public.can_access_booking_conversation(booking_id));

drop policy if exists "Users read own message receipts" on public.booking_message_reads;
create policy "Users read own message receipts"
on public.booking_message_reads
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_tutodemy_admin()
);

drop policy if exists "Admins read conversation reports" on public.booking_message_reports;
create policy "Admins read conversation reports"
on public.booking_message_reports
for select
to authenticated
using (public.is_tutodemy_admin());

create or replace function public.get_my_message_threads()
returns table (
  booking_id uuid,
  learner_id uuid,
  tutor_id uuid,
  other_party_name text,
  subject text,
  requested_start timestamptz,
  booking_status text,
  last_message text,
  last_message_at timestamptz,
  message_count bigint,
  unread_count bigint,
  can_message boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id as booking_id,
    b.learner_id,
    b.tutor_id,
    case
      when public.is_tutodemy_admin() then concat_ws(' ↔ ', nullif(b.tutor_name_snapshot,''), nullif(b.learner_name_snapshot,''))
      when b.learner_id = (select auth.uid()) then coalesce(nullif(b.tutor_name_snapshot,''), 'Tutor')
      else coalesce(nullif(b.learner_name_snapshot,''), 'Learner')
    end as other_party_name,
    b.subject,
    b.requested_start,
    b.status as booking_status,
    coalesce(last_row.body, 'No messages yet.') as last_message,
    last_row.created_at as last_message_at,
    (select count(*) from public.booking_messages all_messages where all_messages.booking_id = b.id) as message_count,
    (
      select count(*)
      from public.booking_messages unread
      where unread.booking_id = b.id
        and unread.created_at > coalesce(read_row.last_read_at, '1970-01-01 00:00:00+00'::timestamptz)
        and (unread.sender_id is null or unread.sender_id <> (select auth.uid()))
    ) as unread_count,
    public.can_send_booking_message(b.id) as can_message
  from public.bookings b
  left join lateral (
    select m.body, m.created_at
    from public.booking_messages m
    where m.booking_id = b.id
    order by m.created_at desc, m.id desc
    limit 1
  ) last_row on true
  left join public.booking_message_reads read_row
    on read_row.booking_id = b.id
   and read_row.user_id = (select auth.uid())
  where
    b.learner_id = (select auth.uid())
    or b.tutor_id = (select auth.uid())
    or public.is_tutodemy_admin()
  order by coalesce(last_row.created_at, b.updated_at, b.created_at) desc
  limit 300;
$$;

create or replace function public.get_booking_messages(p_booking_id uuid)
returns table (
  id uuid,
  booking_id uuid,
  message_type text,
  body text,
  created_at timestamptz,
  sender_role text,
  sender_label text,
  is_mine boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if not public.can_access_booking_conversation(p_booking_id) then
    raise exception 'You do not have access to this booking conversation.';
  end if;

  return query
  select
    m.id,
    m.booking_id,
    m.message_type,
    m.body,
    m.created_at,
    case
      when m.sender_id is null then 'system'
      when m.sender_id = b.tutor_id then 'tutor'
      when m.sender_id = b.learner_id then 'learner'
      when exists (select 1 from public.admin_users a where a.user_id = m.sender_id) then 'admin'
      else 'account'
    end as sender_role,
    case
      when m.sender_id is null then 'TutoDemy'
      when m.sender_id = b.tutor_id then coalesce(nullif(b.tutor_name_snapshot,''), 'Tutor')
      when m.sender_id = b.learner_id then coalesce(nullif(b.learner_name_snapshot,''), 'Learner')
      when exists (select 1 from public.admin_users a where a.user_id = m.sender_id) then 'TutoDemy Support'
      else 'Account'
    end as sender_label,
    m.sender_id = (select auth.uid()) as is_mine
  from public.booking_messages m
  join public.bookings b on b.id = m.booking_id
  where m.booking_id = p_booking_id
  order by m.created_at asc, m.id asc
  limit 1000;
end;
$$;

create or replace function public.send_booking_message(p_booking_id uuid, p_body text)
returns public.booking_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cleaned text := trim(coalesce(p_body,''));
  result public.booking_messages;
begin
  if uid is null then
    raise exception 'Authentication required.';
  end if;
  if not public.can_send_booking_message(p_booking_id) then
    raise exception 'Messaging opens after the tutor accepts the booking and closes for cancelled or declined requests.';
  end if;
  if char_length(cleaned) < 1 then
    raise exception 'Write a message before sending.';
  end if;
  if char_length(cleaned) > 2000 then
    raise exception 'Messages must be 2,000 characters or shorter.';
  end if;

  insert into public.booking_messages (booking_id, sender_id, message_type, body)
  values (p_booking_id, uid, 'text', cleaned)
  returning * into result;

  insert into public.booking_message_reads (booking_id, user_id, last_read_at)
  values (p_booking_id, uid, now())
  on conflict (booking_id, user_id)
  do update set last_read_at = excluded.last_read_at;

  return result;
end;
$$;

create or replace function public.mark_booking_messages_read(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Authentication required.';
  end if;
  if not public.can_access_booking_conversation(p_booking_id) then
    raise exception 'You do not have access to this booking conversation.';
  end if;

  insert into public.booking_message_reads (booking_id, user_id, last_read_at)
  values (p_booking_id, uid, now())
  on conflict (booking_id, user_id)
  do update set last_read_at = excluded.last_read_at;
end;
$$;

create or replace function public.report_booking_conversation(
  p_booking_id uuid,
  p_message_id uuid default null,
  p_reason text default 'Safety concern',
  p_details text default ''
)
returns public.booking_message_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cleaned_reason text := trim(coalesce(p_reason,''));
  cleaned_details text := trim(coalesce(p_details,''));
  result public.booking_message_reports;
begin
  if uid is null then
    raise exception 'Authentication required.';
  end if;
  if not public.can_access_booking_conversation(p_booking_id) then
    raise exception 'You do not have access to this booking conversation.';
  end if;
  if p_message_id is not null and not exists (
    select 1 from public.booking_messages m
    where m.id = p_message_id and m.booking_id = p_booking_id
  ) then
    raise exception 'The selected message does not belong to this booking.';
  end if;
  if char_length(cleaned_reason) < 2 or char_length(cleaned_reason) > 120 then
    raise exception 'Provide a short report reason.';
  end if;
  if char_length(cleaned_details) > 1500 then
    raise exception 'Report details must be 1,500 characters or shorter.';
  end if;

  insert into public.booking_message_reports (
    booking_id, reported_message_id, reporter_id, reason, details
  ) values (
    p_booking_id, p_message_id, uid, cleaned_reason, cleaned_details
  ) returning * into result;

  return result;
end;
$$;

create or replace function public.admin_get_message_reports()
returns table (
  id uuid,
  booking_id uuid,
  reported_message_id uuid,
  reason text,
  details text,
  status text,
  admin_note text,
  created_at timestamptz,
  resolved_at timestamptz,
  reporter_label text,
  booking_label text,
  reported_message_body text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_tutodemy_admin() then
    raise exception 'Administrator access required.';
  end if;

  return query
  select
    r.id,
    r.booking_id,
    r.reported_message_id,
    r.reason,
    r.details,
    r.status,
    r.admin_note,
    r.created_at,
    r.resolved_at,
    case
      when r.reporter_id = b.learner_id then coalesce(nullif(b.learner_name_snapshot,''), 'Learner')
      when r.reporter_id = b.tutor_id then coalesce(nullif(b.tutor_name_snapshot,''), 'Tutor')
      else 'Administrator'
    end as reporter_label,
    concat_ws(' ↔ ', nullif(b.tutor_name_snapshot,''), nullif(b.learner_name_snapshot,'')) as booking_label,
    m.body as reported_message_body
  from public.booking_message_reports r
  join public.bookings b on b.id = r.booking_id
  left join public.booking_messages m on m.id = r.reported_message_id
  order by
    case r.status when 'open' then 0 when 'reviewing' then 1 else 2 end,
    r.created_at desc
  limit 300;
end;
$$;

create or replace function public.admin_resolve_message_report(
  p_report_id uuid,
  p_status text,
  p_admin_note text default ''
)
returns public.booking_message_reports
language plpgsql
security definer
set search_path = ''
as $$
declare result public.booking_message_reports;
begin
  if not public.is_tutodemy_admin() then
    raise exception 'Administrator access required.';
  end if;
  if p_status not in ('reviewing','resolved','dismissed') then
    raise exception 'Invalid report status.';
  end if;

  update public.booking_message_reports
  set
    status = p_status,
    admin_note = trim(coalesce(p_admin_note,'')),
    resolved_at = case when p_status in ('resolved','dismissed') then now() else null end,
    resolved_by = case when p_status in ('resolved','dismissed') then (select auth.uid()) else null end
  where id = p_report_id
  returning * into result;

  if not found then
    raise exception 'Conversation report not found.';
  end if;
  return result;
end;
$$;

create or replace function public.add_booking_status_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare status_message text;
begin
  if old.status is distinct from new.status then
    status_message := case new.status
      when 'accepted' then 'The tutor accepted this booking. Private messaging is now open for schedule and lesson coordination.'
      when 'paid' then 'Payment was confirmed by TutoDemy.'
      when 'session_delivered' then 'The tutor marked the session as delivered. Administrator completion is pending.'
      when 'completed' then 'This booking was completed.'
      when 'disputed' then 'This booking is under administrator review.'
      when 'cancelled' then 'This booking was cancelled. Messaging is now closed.'
      when 'declined' then 'This booking was declined. Messaging is not available.'
      when 'refunded' then 'This booking was refunded. Messaging is now closed.'
      else null
    end;

    if status_message is not null then
      insert into public.booking_messages (booking_id, sender_id, message_type, body)
      values (new.id, null, 'system', status_message);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists booking_status_message_trigger on public.bookings;
create trigger booking_status_message_trigger
after update of status on public.bookings
for each row
execute function public.add_booking_status_message();

revoke all on function public.get_my_message_threads() from public;
revoke all on function public.get_booking_messages(uuid) from public;
revoke all on function public.send_booking_message(uuid,text) from public;
revoke all on function public.mark_booking_messages_read(uuid) from public;
revoke all on function public.report_booking_conversation(uuid,uuid,text,text) from public;
revoke all on function public.admin_get_message_reports() from public;
revoke all on function public.admin_resolve_message_report(uuid,text,text) from public;

grant execute on function public.get_my_message_threads() to authenticated;
grant execute on function public.get_booking_messages(uuid) to authenticated;
grant execute on function public.send_booking_message(uuid,text) to authenticated;
grant execute on function public.mark_booking_messages_read(uuid) to authenticated;
grant execute on function public.report_booking_conversation(uuid,uuid,text,text) to authenticated;
grant execute on function public.admin_get_message_reports() to authenticated;
grant execute on function public.admin_resolve_message_report(uuid,text,text) to authenticated;

revoke all on table public.booking_messages from anon;
revoke all on table public.booking_message_reads from anon;
revoke all on table public.booking_message_reports from anon;
revoke insert, update, delete on table public.booking_messages from authenticated;
revoke insert, update, delete on table public.booking_message_reads from authenticated;
revoke insert, update, delete on table public.booking_message_reports from authenticated;
grant select on table public.booking_messages to authenticated;
grant select on table public.booking_message_reads to authenticated;
grant select on table public.booking_message_reports to authenticated;

-- Enable live message updates through Supabase Realtime without failing on reruns.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'booking_messages'
     ) then
    alter publication supabase_realtime add table public.booking_messages;
  end if;
end $$;

commit;
