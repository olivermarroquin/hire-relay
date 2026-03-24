-- Migration: 003_review_decision_function.sql
--
-- Adds a transactional DB function for the public candidate review flow.
-- Replaces the non-atomic pattern of:
--   1. UPDATE candidates.status
--   2. INSERT decisions
-- with a single plpgsql function that executes both inside one transaction.
-- This prevents candidates.status from being updated without a corresponding
-- decisions row being written (and vice versa).

create or replace function public.apply_candidate_review_decision(
  p_review_token uuid,
  p_decision     text,
  p_notes        text default null
)
returns table(
  candidate_id    uuid,
  candidate_name  text,
  recruiter_email text,
  role_title      text,
  decision        text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cand_id             uuid;
  v_cand_full_name      text;
  v_cand_role_id        uuid;
  v_cand_recruiter_email text;
  v_role_title          text;
  v_notes               text;
begin

  -- 1. Validate decision value before touching any rows
  if p_decision not in ('interview', 'hold', 'rejected') then
    raise exception 'invalid_decision'
      using hint = 'must be one of: interview, hold, rejected';
  end if;

  -- 2. Lock and fetch only the candidate we need.
  --    FOR UPDATE prevents a concurrent request on the same token from
  --    interleaving writes between the update and insert below.
  select c.id, c.full_name, c.role_id, c.recruiter_email
  into   v_cand_id, v_cand_full_name, v_cand_role_id, v_cand_recruiter_email
  from   candidates c
  where  c.review_token = p_review_token
  for update;

  -- 3. Raise if token matched no row
  if not found then
    raise exception 'candidate_not_found';
  end if;

  -- 4. Normalise notes: trim whitespace, convert blank string to null
  v_notes := nullif(trim(coalesce(p_notes, '')), '');

  -- 5. Update candidate status (runs inside the same transaction as the insert below)
  update candidates
  set    status = p_decision
  where  id = v_cand_id;

  -- 6. Append a new decision row — history is never overwritten
  insert into decisions (candidate_id, decided_by, decision, notes)
  values (v_cand_id, null, p_decision, v_notes);

  -- 7. Fetch role title for the recruiter notification email
  select r.title into v_role_title
  from   roles r
  where  r.id = v_cand_role_id;

  -- 8. Return exactly what the API route needs — nothing more
  return query
  select
    v_cand_id,
    v_cand_full_name,
    v_cand_recruiter_email,
    coalesce(v_role_title, 'the role'::text),
    p_decision;

end;
$$;
