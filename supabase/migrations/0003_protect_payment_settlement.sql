-- D4: only a Super Admin may confirm that money was received.
--
-- The server action enforced this, but RLS still let any Event Admin who can
-- manage the event PATCH the payment row directly through PostgREST with the
-- anon key — so the rule was advisory, not enforced. This moves the invariant
-- into the database, where nothing can route around it.
--
-- What an Event Admin may still do: move a pending payment to `processing`
-- ("cash collected, awaiting reconciliation") and annotate it. What they may
-- not do: declare money received, or change what is owed.

create or replace function enforce_payment_settlement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor_is_super boolean;
begin
  -- auth.uid() is null for the service-role key and for direct psql (seeds,
  -- migrations, maintenance). Those are trusted server-side callers.
  if auth.uid() is null then
    return new;
  end if;

  actor_is_super := is_super_admin();
  if actor_is_super then
    return new;
  end if;

  -- Settling money is Super Admin only.
  if new.status is distinct from old.status
     and new.status in ('paid', 'refunded', 'partially_refunded') then
    raise exception
      'Only a Super Admin can mark a payment as %. Record cash as "processing" instead.',
      new.status
      using errcode = 'check_violation';
  end if;

  -- Nobody but a Super Admin changes what is owed, or who confirmed it.
  if new.subtotal_amount   is distinct from old.subtotal_amount
     or new.discount_amount     is distinct from old.discount_amount
     or new.platform_fee_amount is distinct from old.platform_fee_amount
     or new.tax_amount          is distinct from old.tax_amount
     or new.total_amount        is distinct from old.total_amount
     or new.currency            is distinct from old.currency
     or new.reference_code      is distinct from old.reference_code then
    raise exception 'Only a Super Admin can change payment amounts or the reference.'
      using errcode = 'check_violation';
  end if;

  if new.marked_paid_by is distinct from old.marked_paid_by
     or new.marked_paid_at is distinct from old.marked_paid_at then
    raise exception 'Only a Super Admin can record who confirmed a payment.'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger payments_settlement_guard
  before update on payments
  for each row execute function enforce_payment_settlement();

-- Same reasoning for refunds: the RLS update policy is already Super Admin
-- only, but insertion of an already-settled refund would sidestep it.
create or replace function enforce_refund_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_super_admin() then
    return new;
  end if;

  if new.status <> 'requested' then
    raise exception 'A refund must start as requested. Only a Super Admin can settle one.'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger refunds_insert_guard
  before insert on refunds
  for each row execute function enforce_refund_insert();
