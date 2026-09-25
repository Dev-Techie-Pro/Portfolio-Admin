-- Contact message reply thread (multiple replies per message)

create table if not exists public.contact_message_replies (
  id               uuid primary key default gen_random_uuid(),
  message_id       uuid not null references public.contact_messages (id) on delete cascade,
  body             text not null,
  subject          text,
  cc               text,
  attachment_url   text,
  attachment_name  text,
  attachment_mime  text,
  attachment_size  integer,
  sent_at          timestamptz not null default timezone('utc', now()),
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

create index if not exists contact_message_replies_message_id_idx
  on public.contact_message_replies (message_id);

create index if not exists contact_message_replies_sent_at_idx
  on public.contact_message_replies (sent_at desc);

create trigger contact_message_replies_set_updated_at
  before update on public.contact_message_replies
  for each row execute function public.set_updated_at();

alter table public.contact_message_replies enable row level security;

create policy "Staff manage contact message replies"
  on public.contact_message_replies for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

-- Backfill legacy single reply_body into thread rows
insert into public.contact_message_replies (message_id, body, subject, sent_at, created_at, updated_at)
select
  m.id,
  m.reply_body,
  m.subject,
  coalesce(m.replied_at, m.updated_at, m.created_at),
  coalesce(m.replied_at, m.updated_at, m.created_at),
  coalesce(m.replied_at, m.updated_at, m.created_at)
from public.contact_messages m
where m.reply_body is not null
  and length(trim(m.reply_body)) > 0
  and not exists (
    select 1 from public.contact_message_replies r where r.message_id = m.id
  );
