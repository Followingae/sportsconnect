-- Consumers could not complete a team registration.
--
-- `teams` only had teams_read (select) and teams_manage (all, gated on
-- can_manage_event). Nothing let a captain create the team they are
-- registering, so every team-format signup failed at the first insert with
-- "new row violates row-level security policy for table teams", surfaced in
-- the UI as "Couldn't create your team. Try again."
--
-- Two further gaps in the same flow, both silent because the action does not
-- check their errors:
--   * squad members are inserted as registrations with user_id = null, which
--     regs_self_insert rejects (it requires user_id = auth.uid()), so named
--     teammates were dropped without a word;
--   * the rollback path deletes the registration and team when a later step
--     fails, but only regs_admin_delete / teams_manage grant delete, so failed
--     attempts left orphaned rows behind.
--
-- Policies are OR'd, so each of these is purely additive — no existing grant
-- is widened, and nothing here lets anyone touch another person's rows.

-- --- teams ------------------------------------------------------------------

-- A captain may create their own team, but only on an event that is actually
-- accepting entries. sold_out is included because a sold-out event still takes
-- waitlist registrations (see gateFor() in lib/event-state.ts).
create policy teams_self_create on teams
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from events e
      where e.id = teams.event_id
        and e.status in ('registration_open', 'sold_out')
        and e.registration_model = 'team'
    )
  );

-- Renaming your own team.
create policy teams_self_update on teams
  for update using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Deleting your own team, but not once anyone else has registered into it —
-- that would strand their registrations.
create policy teams_self_delete on teams
  for delete using (
    created_by = auth.uid()
    and not exists (
      select 1 from registrations r
      where r.team_id = teams.id
        and r.user_id is not null
        and r.user_id <> auth.uid()
    )
  );

-- --- registrations ----------------------------------------------------------

-- Named squad members have no account of their own: user_id is null and the
-- captain is recorded in created_by. Restricted to teams the caller created,
-- so this cannot be used to inject participants into someone else's team.
create policy regs_squad_insert on registrations
  for insert with check (
    user_id is null
    and created_by = auth.uid()
    and source = 'online'
    and team_id is not null
    and exists (
      select 1 from teams t
      where t.id = registrations.team_id
        and t.created_by = auth.uid()
    )
  );

-- The rollback path. Deliberately narrow: only rows the caller owns or created,
-- only while still unsettled, and never once money has been taken — a paid
-- registration must be cancelled through the refund flow so the trail survives.
create policy regs_self_delete on registrations
  for delete using (
    (user_id = auth.uid() or created_by = auth.uid())
    and status in ('pending', 'waitlisted')
    and not exists (
      select 1 from payments p
      where p.registration_id = registrations.id
        and p.status in ('paid', 'refunded', 'partially_refunded')
    )
  );
