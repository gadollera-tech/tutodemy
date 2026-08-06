begin;

-- ---------------------------------------------------------------------------
-- Private booking access and tutor-only fee disclosure
-- ---------------------------------------------------------------------------

create or replace function public.get_my_learner_bookings()
returns table (
  id uuid,
  tutor_id uuid,
  tutor_name_snapshot text,
  requested_start timestamptz,
  duration_minutes integer,
  mode text,
  subject text,
  learning_goal text,
  gross_amount numeric,
  status text,
  payment_status text,
  tutor_response_note text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    b.id,
    b.tutor_id,
    b.tutor_name_snapshot,
    b.requested_start,
    b.duration_minutes,
    b.mode,
    b.subject,
    b.learning_goal,
    b.gross_amount,
    b.status,
    b.payment_status,
    b.tutor_response_note,
    b.created_at,
    b.updated_at
  from public.bookings b
  where b.learner_id = (select auth.uid())
  order by b.requested_start desc;
$$;

create or replace function public.get_my_tutor_bookings()
returns table (
  id uuid,
  learner_id uuid,
  tutor_id uuid,
  learner_name_snapshot text,
  tutor_name_snapshot text,
  requested_start timestamptz,
  duration_minutes integer,
  mode text,
  subject text,
  learning_goal text,
  location_details text,
  gross_amount numeric,
  status text,
  payment_status text,
  tutor_response_note text,
  commission_rate numeric,
  commission_amount numeric,
  tutor_net_amount numeric,
  commission_tier text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    b.id,
    b.learner_id,
    b.tutor_id,
    b.learner_name_snapshot,
    b.tutor_name_snapshot,
    b.requested_start,
    b.duration_minutes,
    b.mode,
    b.subject,
    b.learning_goal,
    b.location_details,
    b.gross_amount,
    b.status,
    b.payment_status,
    b.tutor_response_note,
    b.commission_rate,
    b.commission_amount,
    b.tutor_net_amount,
    b.commission_tier,
    b.created_at,
    b.updated_at
  from public.bookings b
  where b.tutor_id = (select auth.uid())
  order by b.requested_start desc;
$$;

create or replace function public.admin_list_bookings()
returns setof public.bookings
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.is_tutodemy_admin() then
    raise exception 'Administrator access required.';
  end if;
  return query
  select b.*
  from public.bookings b
  order by b.created_at desc
  limit 300;
end;
$$;

create or replace function public.get_my_tutor_fee_policy()
returns table (
  policy_order integer,
  tier_key text,
  tier_label text,
  rate numeric,
  description text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;
  if not exists (
    select 1
    from public.tutor_profiles tp
    where tp.user_id = (select auth.uid())
  ) then
    raise exception 'Tutor profile required.';
  end if;

  return query
  values
    (1, 'founding'::text, 'Founding Tutor'::text, 10::numeric, 'First 20 completed sessions for eligible founding tutors.'::text),
    (2, 'regular'::text, 'Regular Tutor'::text, 15::numeric, 'Standard rate after the founding benefit or before an achievement tier applies.'::text),
    (3, 'achievement'::text, 'High-Volume or Top-Rated Tutor'::text, 12::numeric, 'Reduced rate for tutors who meet the required session, rating, review, cancellation, and account-standing criteria.'::text);
end;
$$;

revoke all on function public.get_my_learner_bookings() from public;
revoke all on function public.get_my_tutor_bookings() from public;
revoke all on function public.admin_list_bookings() from public;
revoke all on function public.get_my_tutor_fee_policy() from public;


revoke select on public.bookings from authenticated;
grant execute on function public.get_my_learner_bookings() to authenticated;
grant execute on function public.get_my_tutor_bookings() to authenticated;
grant execute on function public.admin_list_bookings() to authenticated;
grant execute on function public.get_my_tutor_fee_policy() to authenticated;

commit;
