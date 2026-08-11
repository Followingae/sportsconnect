-- Which tables have RLS on, and what each policy actually permits.
-- polcmd: r = select, a = insert, w = update, d = delete, * = all
select
  c.relname                                                as tbl,
  c.relrowsecurity                                         as rls,
  count(p.polname)                                         as policies,
  count(p.polname) filter (where p.polcmd in ('a', '*'))   as can_insert,
  count(p.polname) filter (where p.polcmd in ('r', '*'))   as can_select,
  count(p.polname) filter (where p.polcmd in ('w', '*'))   as can_update,
  count(p.polname) filter (where p.polcmd in ('d', '*'))   as can_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join pg_policy p on p.polrelid = c.oid
where c.relkind = 'r'
group by 1, 2
order by 1;
