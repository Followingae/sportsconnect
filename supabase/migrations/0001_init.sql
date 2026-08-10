-- ============================================================================
-- SPORTSCONNECT — initial schema
-- Covers BRD §4 (roles), §5 (event lifecycle), §6 (sports/formats),
-- §7–§8 (event creation + configuration), §9–§10 (participants),
-- §11 (teams), §16–§18 (payments/fees/refunds), §24 (custom questions),
-- §25 (notifications), §28 (admin user management) and audit logging.
--
-- PAYMENTS AMENDMENT: online card payment is out of MVP scope. The enum keeps
-- an 'online' member so the column never has to be migrated when the gateway
-- lands, but `payment_methods_enabled` in platform_settings gates what the UI
-- may offer, and it ships with online disabled.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ============================================================================
-- ENUMS
-- ============================================================================

create type user_role as enum ('consumer', 'event_admin', 'super_admin');

create type account_status as enum ('active', 'inactive', 'suspended');

-- BRD §5. The happy path is draft → submitted → under_review → approved →
-- published → registration_open → registration_closed → completed → archived.
-- The rest are the documented alternative states.
create type event_status as enum (
  'draft',
  'submitted',
  'under_review',
  'changes_requested',
  'approved',
  'published',
  'registration_open',
  'registration_closed',
  'completed',
  'archived',
  'rejected',
  'cancelled',
  'suspended',
  'sold_out'
);

create type registration_model as enum ('individual', 'team');

create type registration_status as enum (
  'pending',      -- created, awaiting payment or admin confirmation
  'confirmed',
  'waitlisted',
  'cancelled',
  'no_show'
);

create type registration_source as enum ('online', 'admin');

create type participant_role as enum ('player', 'captain', 'substitute');

-- 'online' is reserved for the future gateway and is disabled at the settings
-- layer. 'comp' covers complimentary / sponsor / VIP entries (BRD §9 method 2).
create type payment_method as enum ('bank_transfer', 'cash_at_venue', 'online', 'comp');

create type payment_status as enum (
  'pending',
  'processing',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded'
);

create type refund_type as enum ('full', 'partial', 'credit', 'transfer', 'none');

create type refund_status as enum (
  'requested',
  'approved',
  'processing',
  'refunded',
  'declined'
);

create type question_type as enum (
  'text',
  'number',
  'dropdown',
  'multiple_choice',
  'checkbox',
  'date',
  'file'
);

create type gender_requirement as enum ('any', 'male', 'female', 'mixed');

create type fee_mode as enum ('none', 'fixed', 'percentage', 'fixed_plus_percentage');

create type message_audience as enum ('all', 'confirmed', 'waitlisted', 'unpaid');

-- ============================================================================
-- IDENTITY
-- ============================================================================

create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          user_role      not null default 'consumer',
  status        account_status not null default 'active',
  full_name     text           not null default '',
  email         citext         not null,
  phone         text,
  date_of_birth date,
  gender        text,
  nationality   text,
  avatar_url    text,
  -- Free-form consumer preferences (favourite sports, notification opt-ins).
  preferences   jsonb          not null default '{}'::jsonb,
  created_at    timestamptz    not null default now(),
  updated_at    timestamptz    not null default now()
);

create index profiles_role_idx on profiles (role);
create index profiles_email_idx on profiles (email);

-- Event Admins belong to an organizing body ("Padel Pro", "Dink Dubai").
create table organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  contact_email citext,
  contact_phone text,
  logo_url      text,
  created_at    timestamptz not null default now()
);

create table event_admin_profiles (
  user_id         uuid primary key references profiles (id) on delete cascade,
  organization_id uuid references organizations (id) on delete set null,
  title           text,
  created_by      uuid references profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- BRD §4.2: "Permissions should ideally be configurable rather than hard-coded."
-- One row per granted permission. Absence of a row means not granted.
create table event_admin_permissions (
  user_id    uuid not null references profiles (id) on delete cascade,
  permission text not null,
  granted_by uuid references profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, permission)
);

comment on table event_admin_permissions is
  'Known keys: create_event, edit_event, submit_event, manage_participants, '
  'add_remove_participants, manage_teams, view_registrations, view_payments, '
  'send_notifications, manage_content, export_data.';

-- ============================================================================
-- REFERENCE DATA — sports, formats, venues
-- ============================================================================

create table sports (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text        not null,
  cover_url  text,
  is_active  boolean     not null default true,
  sort_order int         not null default 0,
  created_at timestamptz not null default now()
);

create table sport_formats (
  id                 uuid primary key default gen_random_uuid(),
  sport_id           uuid not null references sports (id) on delete cascade,
  slug               text not null,
  name               text not null,
  -- Whether this format is played solo or in squads. Drives which builder
  -- fields and which registration flow the UI shows.
  registration_model registration_model not null default 'individual',
  default_team_size  int,
  default_substitutes int not null default 0,
  is_active          boolean not null default true,
  sort_order         int     not null default 0,
  unique (sport_id, slug)
);

create table venues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  city       text not null default 'Dubai',
  country    text not null default 'AE',
  latitude   numeric(10, 7),
  longitude  numeric(10, 7),
  -- Venue *accounts* are Coming Soon; venues exist as reference data now so
  -- events can point at them and Super Admin can pre-register them.
  is_claimed boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- EVENTS
-- ============================================================================

create table events (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,

  -- §7.1 Basic information
  name              text not null,
  sport_id          uuid not null references sports (id) on delete restrict,
  format_id         uuid references sport_formats (id) on delete restrict,
  description       text not null default '',
  organizer_id      uuid not null references profiles (id) on delete restrict,
  organization_id   uuid references organizations (id) on delete set null,
  banner_url        text,
  gallery           jsonb not null default '[]'::jsonb,

  venue_id          uuid references venues (id) on delete set null,
  venue_name        text,       -- fallback when the venue isn't in the table yet
  venue_address     text,
  latitude          numeric(10, 7),
  longitude         numeric(10, 7),

  starts_at         timestamptz not null,
  ends_at           timestamptz,
  registration_opens_at  timestamptz,
  registration_closes_at timestamptz,
  timezone          text not null default 'Asia/Dubai',

  -- §12 consumer event page content
  rules             text,
  eligibility       text,
  whats_included    text[] not null default '{}',
  participant_requirements text,
  cancellation_policy text,
  sponsors          jsonb not null default '[]'::jsonb,
  contact_name      text,
  contact_email     citext,
  contact_phone     text,
  terms             text,

  -- §15/§17 pricing. Entry fee is per player or per team depending on format.
  registration_model registration_model not null default 'individual',
  price_amount      numeric(10, 2) not null default 0,
  currency          char(3) not null default 'AED',
  price_unit        text not null default 'per_player'
                      check (price_unit in ('per_player', 'per_team')),
  tax_percent       numeric(5, 2) not null default 0,

  -- §5 lifecycle
  status            event_status not null default 'draft',
  is_featured       boolean not null default false,
  submitted_at      timestamptz,
  reviewed_at       timestamptz,
  reviewed_by       uuid references profiles (id) on delete set null,
  review_note       text,     -- shown to the organizer on reject/request-changes
  published_at      timestamptz,
  cancelled_at      timestamptz,
  cancellation_reason text,

  created_by        uuid references profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint events_dates_sane check (ends_at is null or ends_at >= starts_at),
  constraint events_reg_window_sane check (
    registration_opens_at is null
    or registration_closes_at is null
    or registration_closes_at >= registration_opens_at
  )
);

create index events_status_idx on events (status);
create index events_sport_idx on events (sport_id);
create index events_starts_idx on events (starts_at);
create index events_organizer_idx on events (organizer_id);
create index events_featured_idx on events (is_featured) where is_featured;

-- §8.1 participant configuration, 1:1 with an event.
create table event_config (
  event_id            uuid primary key references events (id) on delete cascade,
  max_participants    int,
  min_participants    int not null default 0,
  waitlist_capacity   int not null default 0,
  min_age             int,
  max_age             int,
  gender_requirement  gender_requirement not null default 'any',
  skill_levels        text[] not null default '{}',
  team_size           int,
  max_teams           int,
  substitutes_per_team int not null default 0,
  allow_individual_join boolean not null default false,
  check (max_participants is null or max_participants >= min_participants),
  check (min_age is null or max_age is null or max_age >= min_age)
);

-- BRD §28: Super Admin assigns specific events to specific Event Admins.
create table event_admin_assignments (
  event_id    uuid not null references events (id) on delete cascade,
  user_id     uuid not null references profiles (id) on delete cascade,
  assigned_by uuid references profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- §24 custom registration questions
create table custom_questions (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events (id) on delete cascade,
  label       text not null,
  help_text   text,
  type        question_type not null,
  options     jsonb not null default '[]'::jsonb, -- for dropdown / choice / checkbox
  is_required boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index custom_questions_event_idx on custom_questions (event_id, sort_order);

-- ============================================================================
-- TEAMS & REGISTRATIONS
-- ============================================================================

create table teams (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events (id) on delete cascade,
  name       text not null,
  notes      text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create index teams_event_idx on teams (event_id);

create table registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events (id) on delete cascade,
  -- Null for admin-added walk-ins who have no platform account (BRD §9 method 2).
  user_id       uuid references profiles (id) on delete set null,
  team_id       uuid references teams (id) on delete set null,

  -- Snapshotted at registration time so the roster stays correct even if the
  -- person later edits their profile.
  participant_name  text not null,
  participant_email citext,
  participant_phone text,

  role          participant_role not null default 'player',
  status        registration_status not null default 'pending',
  source        registration_source not null default 'online',
  is_captain    boolean not null default false,

  waitlist_position int,
  registered_at timestamptz not null default now(),
  confirmed_at  timestamptz,
  cancelled_at  timestamptz,
  cancellation_reason text,
  cancelled_by  uuid references profiles (id) on delete set null,
  checked_in_at timestamptz,

  notes         text,
  created_by    uuid references profiles (id) on delete set null,
  updated_at    timestamptz not null default now()
);

create index registrations_event_idx on registrations (event_id);
create index registrations_user_idx on registrations (user_id);
create index registrations_team_idx on registrations (team_id);
create index registrations_status_idx on registrations (event_id, status);

-- One live registration per person per event. Cancelled rows are excluded so a
-- consumer who cancels can register again.
create unique index registrations_one_live_per_user
  on registrations (event_id, user_id)
  where user_id is not null and status <> 'cancelled';

create table registration_answers (
  registration_id uuid not null references registrations (id) on delete cascade,
  question_id     uuid not null references custom_questions (id) on delete cascade,
  value           jsonb not null,
  primary key (registration_id, question_id)
);

-- ============================================================================
-- MONEY — payments, refunds, fees, credit
-- ============================================================================

-- §17 configurable platform fee. Scope lets Super Admin set a global default
-- and override per sport or per event without a schema change.
create table platform_fee_config (
  id          uuid primary key default gen_random_uuid(),
  scope       text not null check (scope in ('global', 'sport', 'event')),
  sport_id    uuid references sports (id) on delete cascade,
  event_id    uuid references events (id) on delete cascade,
  mode        fee_mode not null default 'percentage',
  fixed_amount numeric(10, 2) not null default 0,
  percentage  numeric(5, 2) not null default 0,
  is_active   boolean not null default true,
  updated_by  uuid references profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  check (
    (scope = 'global' and sport_id is null and event_id is null)
    or (scope = 'sport' and sport_id is not null and event_id is null)
    or (scope = 'event' and event_id is not null and sport_id is null)
  )
);

create unique index platform_fee_one_global
  on platform_fee_config ((true)) where scope = 'global' and is_active;

create table payments (
  id                uuid primary key default gen_random_uuid(),
  registration_id   uuid not null references registrations (id) on delete cascade,
  event_id          uuid not null references events (id) on delete cascade,
  -- Human-quotable code the consumer puts in their bank transfer reference and
  -- the admin searches for when reconciling. e.g. SC-PADL-7Q2K
  reference_code    text unique not null,

  -- §15 the breakdown the consumer must see before confirming.
  subtotal_amount   numeric(10, 2) not null default 0,
  discount_amount   numeric(10, 2) not null default 0,
  platform_fee_amount numeric(10, 2) not null default 0,
  tax_amount        numeric(10, 2) not null default 0,
  total_amount      numeric(10, 2) not null default 0,
  currency          char(3) not null default 'AED',

  method            payment_method not null,
  status            payment_status not null default 'pending',

  -- Manual settlement trail (bank transfer / cash at venue).
  payer_reference   text,   -- what the consumer says they used at their bank
  proof_url         text,   -- optional uploaded transfer receipt
  marked_paid_by    uuid references profiles (id) on delete set null,
  marked_paid_at    timestamptz,
  admin_note        text,

  -- Reserved for the future gateway.
  gateway_transaction_id text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index payments_event_idx on payments (event_id);
create index payments_status_idx on payments (status);
create index payments_registration_idx on payments (registration_id);

create table refunds (
  id              uuid primary key default gen_random_uuid(),
  payment_id      uuid not null references payments (id) on delete cascade,
  registration_id uuid not null references registrations (id) on delete cascade,
  amount          numeric(10, 2) not null default 0,
  currency        char(3) not null default 'AED',
  type            refund_type not null,
  status          refund_status not null default 'requested',
  reason          text,
  policy_applied  text,   -- e.g. "Late cancel · 50% partial"
  initiated_by    uuid references profiles (id) on delete set null,
  initiated_by_role user_role,
  decided_by      uuid references profiles (id) on delete set null,
  decided_at      timestamptz,
  processed_at    timestamptz,
  -- Manual settlement: how the money actually went back.
  settlement_note text,
  proof_url       text,
  created_at      timestamptz not null default now()
);

create index refunds_status_idx on refunds (status);

-- Account-level perks a Super Admin can grant (design P4).
create table account_credits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  amount     numeric(10, 2) not null,
  currency   char(3) not null default 'AED',
  reason     text,
  granted_by uuid references profiles (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table account_discounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  percent    numeric(5, 2) not null check (percent > 0 and percent <= 100),
  reason     text,
  granted_by uuid references profiles (id) on delete set null,
  is_active  boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- COMMUNICATION & OVERSIGHT
-- ============================================================================

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where read_at is null;

create table event_messages (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events (id) on delete cascade,
  sender_id  uuid references profiles (id) on delete set null,
  audience   message_audience not null default 'all',
  subject    text not null,
  body       text not null,
  recipient_count int not null default 0,
  sent_at    timestamptz not null default now()
);

-- BRD §10/§20: "All important changes should be recorded in an audit log."
create table audit_log (
  id          bigserial primary key,
  actor_id    uuid references profiles (id) on delete set null,
  actor_role  user_role,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  summary     text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity_type, entity_id, created_at desc);
create index audit_log_actor_idx on audit_log (actor_id, created_at desc);

-- Singleton row of system-wide settings (BRD §3.1 "configure system-wide settings").
create table platform_settings (
  id                      boolean primary key default true check (id),
  payment_methods_enabled payment_method[] not null
                            default array['bank_transfer', 'cash_at_venue']::payment_method[],
  bank_account_name       text,
  bank_name               text,
  bank_iban               text,
  bank_swift              text,
  support_email           citext,
  support_phone           text,
  default_currency        char(3) not null default 'AED',
  default_terms           text,
  default_cancellation_policy text,
  updated_by              uuid references profiles (id) on delete set null,
  updated_at              timestamptz not null default now()
);

insert into platform_settings (id) values (true) on conflict do nothing;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();
create trigger events_touch before update on events
  for each row execute function touch_updated_at();
create trigger registrations_touch before update on registrations
  for each row execute function touch_updated_at();
create trigger payments_touch before update on payments
  for each row execute function touch_updated_at();

-- Mirror a new auth user into profiles so the app always has a profile row.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'consumer')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- AUTHORIZATION HELPERS
-- ============================================================================

create or replace function current_role_of()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'super_admin' and status = 'active'
  );
$$;

create or replace function is_event_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'event_admin' and status = 'active'
  );
$$;

create or replace function has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select is_super_admin() or exists (
    select 1 from event_admin_permissions
    where user_id = auth.uid() and permission = p_permission
  );
$$;

-- An Event Admin reaches an event either by owning it or by assignment.
create or replace function can_manage_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_super_admin() or exists (
    select 1 from events e
    where e.id = p_event_id
      and (
        e.organizer_id = auth.uid()
        or exists (
          select 1 from event_admin_assignments a
          where a.event_id = e.id and a.user_id = auth.uid()
        )
      )
  );
$$;

-- The only statuses a cold visitor may see. BRD §5: nothing reaches the public
-- before Super Admin approval.
create or replace function is_publicly_visible(p_status event_status)
returns boolean language sql immutable as $$
  select p_status in (
    'published', 'registration_open', 'registration_closed',
    'completed', 'sold_out', 'cancelled'
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles                enable row level security;
alter table organizations           enable row level security;
alter table event_admin_profiles    enable row level security;
alter table event_admin_permissions enable row level security;
alter table sports                  enable row level security;
alter table sport_formats           enable row level security;
alter table venues                  enable row level security;
alter table events                  enable row level security;
alter table event_config            enable row level security;
alter table event_admin_assignments enable row level security;
alter table custom_questions        enable row level security;
alter table teams                   enable row level security;
alter table registrations           enable row level security;
alter table registration_answers    enable row level security;
alter table platform_fee_config     enable row level security;
alter table payments                enable row level security;
alter table refunds                 enable row level security;
alter table account_credits         enable row level security;
alter table account_discounts       enable row level security;
alter table notifications           enable row level security;
alter table event_messages          enable row level security;
alter table audit_log               enable row level security;
alter table platform_settings       enable row level security;

-- --- profiles ---------------------------------------------------------------
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or is_super_admin());
create policy profiles_self_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on profiles
  for all using (is_super_admin()) with check (is_super_admin());

-- --- reference data: world-readable, super-admin writable -------------------
create policy sports_read on sports for select using (true);
create policy sports_write on sports for all
  using (is_super_admin()) with check (is_super_admin());

create policy formats_read on sport_formats for select using (true);
create policy formats_write on sport_formats for all
  using (is_super_admin()) with check (is_super_admin());

create policy venues_read on venues for select using (true);
create policy venues_write on venues for all
  using (is_super_admin() or is_event_admin())
  with check (is_super_admin() or is_event_admin());

create policy orgs_read on organizations for select using (true);
create policy orgs_write on organizations for all
  using (is_super_admin()) with check (is_super_admin());

-- --- event admin records ----------------------------------------------------
create policy eap_read on event_admin_profiles
  for select using (user_id = auth.uid() or is_super_admin());
create policy eap_write on event_admin_profiles
  for all using (is_super_admin()) with check (is_super_admin());

create policy perms_read on event_admin_permissions
  for select using (user_id = auth.uid() or is_super_admin());
create policy perms_write on event_admin_permissions
  for all using (is_super_admin()) with check (is_super_admin());

create policy assign_read on event_admin_assignments
  for select using (user_id = auth.uid() or is_super_admin());
create policy assign_write on event_admin_assignments
  for all using (is_super_admin()) with check (is_super_admin());

-- --- events -----------------------------------------------------------------
create policy events_public_read on events
  for select using (
    is_publicly_visible(status) or can_manage_event(id)
  );
create policy events_admin_insert on events
  for insert with check (
    is_super_admin() or (is_event_admin() and has_permission('create_event')
                         and organizer_id = auth.uid())
  );
create policy events_admin_update on events
  for update using (can_manage_event(id)) with check (can_manage_event(id));
create policy events_super_delete on events
  for delete using (is_super_admin());

create policy event_config_read on event_config
  for select using (
    exists (select 1 from events e where e.id = event_id
            and (is_publicly_visible(e.status) or can_manage_event(e.id)))
  );
create policy event_config_write on event_config
  for all using (can_manage_event(event_id)) with check (can_manage_event(event_id));

create policy questions_read on custom_questions
  for select using (
    exists (select 1 from events e where e.id = event_id
            and (is_publicly_visible(e.status) or can_manage_event(e.id)))
  );
create policy questions_write on custom_questions
  for all using (can_manage_event(event_id)) with check (can_manage_event(event_id));

-- --- teams ------------------------------------------------------------------
create policy teams_read on teams
  for select using (
    exists (select 1 from events e where e.id = event_id
            and (is_publicly_visible(e.status) or can_manage_event(e.id)))
  );
create policy teams_manage on teams
  for all using (can_manage_event(event_id)) with check (can_manage_event(event_id));

-- --- registrations ----------------------------------------------------------
create policy regs_own_read on registrations
  for select using (user_id = auth.uid() or can_manage_event(event_id));
create policy regs_self_insert on registrations
  for insert with check (
    (user_id = auth.uid() and source = 'online')
    or can_manage_event(event_id)
  );
create policy regs_update on registrations
  for update using (user_id = auth.uid() or can_manage_event(event_id))
  with check (user_id = auth.uid() or can_manage_event(event_id));
create policy regs_admin_delete on registrations
  for delete using (can_manage_event(event_id));

create policy answers_read on registration_answers
  for select using (
    exists (select 1 from registrations r where r.id = registration_id
            and (r.user_id = auth.uid() or can_manage_event(r.event_id)))
  );
create policy answers_write on registration_answers
  for all using (
    exists (select 1 from registrations r where r.id = registration_id
            and (r.user_id = auth.uid() or can_manage_event(r.event_id)))
  ) with check (
    exists (select 1 from registrations r where r.id = registration_id
            and (r.user_id = auth.uid() or can_manage_event(r.event_id)))
  );

-- --- money ------------------------------------------------------------------
create policy payments_read on payments
  for select using (
    exists (select 1 from registrations r where r.id = registration_id
            and r.user_id = auth.uid())
    or can_manage_event(event_id)
  );
-- Consumers may create their own pending payment and attach transfer proof;
-- only an admin may move a payment to 'paid'.
-- Note: qualify with the table name. An unqualified `status` inside the EXISTS
-- subquery would bind to registrations.status, not the payment being inserted.
create policy payments_insert on payments
  for insert with check (
    (
      payments.status = 'pending'
      and exists (
        select 1 from registrations r
        where r.id = payments.registration_id and r.user_id = auth.uid()
      )
    )
    or can_manage_event(payments.event_id)
  );
create policy payments_update on payments
  for update using (can_manage_event(event_id)) with check (can_manage_event(event_id));

create policy refunds_read on refunds
  for select using (
    exists (select 1 from registrations r where r.id = registration_id
            and r.user_id = auth.uid())
    or is_super_admin()
    or exists (select 1 from payments p where p.id = payment_id
               and can_manage_event(p.event_id))
  );
create policy refunds_request on refunds
  for insert with check (
    (
      refunds.status = 'requested'
      and exists (
        select 1 from registrations r
        where r.id = refunds.registration_id and r.user_id = auth.uid()
      )
    )
    or is_super_admin()
  );
-- BRD §18: Super Admin has final authority on refunds.
create policy refunds_decide on refunds
  for update using (is_super_admin()) with check (is_super_admin());

create policy fee_read on platform_fee_config for select using (true);
create policy fee_write on platform_fee_config for all
  using (is_super_admin()) with check (is_super_admin());

create policy credits_read on account_credits
  for select using (user_id = auth.uid() or is_super_admin());
create policy credits_write on account_credits for all
  using (is_super_admin()) with check (is_super_admin());

create policy discounts_read on account_discounts
  for select using (user_id = auth.uid() or is_super_admin());
create policy discounts_write on account_discounts for all
  using (is_super_admin()) with check (is_super_admin());

-- --- comms & oversight ------------------------------------------------------
create policy notif_own on notifications
  for select using (user_id = auth.uid());
create policy notif_own_update on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_admin_insert on notifications
  for insert with check (is_super_admin() or is_event_admin());

create policy messages_read on event_messages
  for select using (can_manage_event(event_id));
create policy messages_write on event_messages
  for insert with check (
    can_manage_event(event_id) and has_permission('send_notifications')
  );

-- The audit log is append-only and readable by Super Admin, plus by an Event
-- Admin for their own actions.
create policy audit_read on audit_log
  for select using (is_super_admin() or actor_id = auth.uid());
create policy audit_insert on audit_log
  for insert with check (auth.uid() is not null);

create policy settings_read on platform_settings for select using (true);
create policy settings_write on platform_settings for all
  using (is_super_admin()) with check (is_super_admin());
