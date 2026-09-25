-- Ensure every tool_categories row has a stable legacy_id (app uses it as categoryId).
with ranked as (
  select
    tc.id,
    coalesce(
      (
        select max(tc2.legacy_id)
        from public.tool_categories tc2
        where tc2.site_id = tc.site_id
          and tc2.legacy_id is not null
      ),
      0
    ) + row_number() over (
      partition by tc.site_id
      order by tc.sort_order nulls last, tc.created_at, tc.id
    ) as new_legacy_id
  from public.tool_categories tc
  where tc.legacy_id is null
)
update public.tool_categories tc
set legacy_id = ranked.new_legacy_id
from ranked
where tc.id = ranked.id;
