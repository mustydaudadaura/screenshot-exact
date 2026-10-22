create table public.workers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  department_id uuid not null references public.departments(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.workers to authenticated;
grant all on public.workers to service_role;
alter table public.workers enable row level security;
create policy "managers read workers" on public.workers for select to authenticated using (public.is_manager(auth.uid()) or public.has_role(auth.uid(),'accountant'));
create policy "managers insert workers" on public.workers for insert to authenticated with check (public.is_manager(auth.uid()));
create policy "managers update workers" on public.workers for update to authenticated using (public.is_manager(auth.uid()));

create table public.department_pay_rates (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id),
  rate_per_bag numeric(12,2) not null check (rate_per_bag >= 0),
  effective_from timestamptz not null default now(),
  created_by uuid default auth.uid()
);
grant select, insert on public.department_pay_rates to authenticated;
grant all on public.department_pay_rates to service_role;
alter table public.department_pay_rates enable row level security;
create policy "managers read rates" on public.department_pay_rates for select to authenticated using (public.is_manager(auth.uid()) or public.has_role(auth.uid(),'accountant'));
create policy "managers insert rates" on public.department_pay_rates for insert to authenticated with check (public.is_manager(auth.uid()));

create trigger audit_workers after insert or update on public.workers for each row execute function public.audit_change();
create trigger audit_rates after insert on public.department_pay_rates for each row execute function public.audit_change();