-- A registration has exactly one payment record. Without this, PostgREST types
-- the `payment:payments(...)` embed as an array on every query, and nothing
-- stops a duplicate payment row being written for the same registration.
--
-- Refunds hang off the payment, so partial refunds don't need extra payment
-- rows.

-- Collapse any duplicates that already exist, keeping the earliest.
delete from payments p
using payments q
where p.registration_id = q.registration_id
  and p.created_at > q.created_at;

create unique index payments_one_per_registration
  on payments (registration_id);
