alter table public.workers add column if not exists pin text;

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers(id),
  work_date date not null default (now() at time zone 'Africa/Lagos')::date,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  recorded_by uuid default auth.uid()
);
create index on public.attendance(work_date);
grant select, insert, update on public.attendance to authenticated;
grant all on public.attendance to service_role;
alter table public.attendance enable row level security;
create policy "staff managers read attendance" on public.attendance for select to authenticated
  using (public.is_manager(auth.uid()) or public.has_role(auth.uid(),'supervisor') or public.has_role(auth.uid(),'accountant'));
create policy "managers write attendance" on public.attendance for insert to authenticated
  with check (public.is_manager(auth.uid()) or public.has_role(auth.uid(),'supervisor'));
create policy "managers update attendance" on public.attendance for update to authenticated
  using (public.is_manager(auth.uid()) or public.has_role(auth.uid(),'supervisor'));

create table public.production_logs (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id),
  work_date date not null,
  bags numeric(10,2) not null check (bags >= 0),
  rate_per_bag numeric(12,2) not null check (rate_per_bag >= 0),
  recorded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (department_id, work_date)
);
grant select, insert, update on public.production_logs to authenticated;
grant all on public.production_logs to service_role;
alter table public.production_logs enable row level security;
create policy "read production logs" on public.production_logs for select to authenticated
  using (public.is_manager(auth.uid()) or public.has_role(auth.uid(),'supervisor') or public.has_role(auth.uid(),'accountant'));
create policy "write production logs" on public.production_logs for insert to authenticated
  with check (public.is_manager(auth.uid()) or public.has_role(auth.uid(),'supervisor'));
create policy "update production logs" on public.production_logs for update to authenticated
  using (public.is_manager(auth.uid()) or public.has_role(auth.uid(),'supervisor'));
create trigger audit_production_logs after insert or update on public.production_logs for each row execute function public.audit_change();

-- Kiosk punch: verifies PIN, toggles clock in / out for today.
create or replace function public.kiosk_punch(_worker_id uuid, _pin text)
returns text language plpgsql security definer set search_path = public as $$
declare w record; a record; today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if not (public.is_manager(auth.uid()) or public.has_role(auth.uid(),'supervisor')) then
    raise exception 'Kiosk must be opened by an admin or supervisor';
  end if;
  select * into w from public.workers where id = _worker_id and is_active;
  if not found then raise exception 'Worker not found'; end if;
  if w.pin is null or w.pin <> _pin then raise exception 'Wrong PIN'; end if;
  select * into a from public.attendance where worker_id = _worker_id and work_date = today order by clock_in desc limit 1;
  if found and a.clock_out is null then
    update public.attendance set clock_out = now() where id = a.id;
    return 'out';
  elsif found then
    raise exception 'Already clocked out today';
  end if;
  insert into public.attendance(worker_id, work_date) values (_worker_id, today);
  return 'in';
end $$;
grant execute on function public.kiosk_punch(uuid, text) to authenticated;