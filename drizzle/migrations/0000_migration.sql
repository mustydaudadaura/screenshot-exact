create type public.app_role as enum ('owner','admin','supervisor','storekeeper','baker','mixer','packager','dispatcher','sales','accountant','cleaner','security','staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  job_title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_manager(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('owner','admin'))
$$;

create policy "read own or managers read all profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_manager(auth.uid()) or public.has_role(auth.uid(),'supervisor'));
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "managers update profiles" on public.profiles for update to authenticated using (public.is_manager(auth.uid()));
create policy "read own roles or managers" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_manager(auth.uid()));

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;
create policy "staff read departments" on public.departments for select to authenticated using (true);
create policy "managers insert departments" on public.departments for insert to authenticated with check (public.is_manager(auth.uid()));
create policy "managers update departments" on public.departments for update to authenticated using (public.is_manager(auth.uid()));

create table public.staff_departments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  is_supervisor boolean not null default false,
  unique (user_id, department_id)
);
grant select, insert, update, delete on public.staff_departments to authenticated;
grant all on public.staff_departments to service_role;
alter table public.staff_departments enable row level security;
create policy "read own or managers" on public.staff_departments for select to authenticated
  using (user_id = auth.uid() or public.is_manager(auth.uid()) or public.has_role(auth.uid(),'supervisor'));
create policy "managers write sd" on public.staff_departments for all to authenticated
  using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

create table public.business_settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Global Concept Bakery',
  currency text not null default 'NGN',
  timezone text not null default 'Africa/Lagos',
  address text,
  phone text,
  invoice_prefix text not null default 'INV-',
  receipt_prefix text not null default 'RCT-',
  dispatch_prefix text not null default 'DSP-',
  remittance_deadline_hours int not null default 24,
  default_credit_limit numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);
grant select, update on public.business_settings to authenticated;
grant all on public.business_settings to service_role;
alter table public.business_settings enable row level security;
create policy "staff read settings" on public.business_settings for select to authenticated using (true);
create policy "managers update settings" on public.business_settings for update to authenticated using (public.is_manager(auth.uid()));
insert into public.business_settings (id) values (1);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "managers read audit" on public.audit_logs for select to authenticated using (public.is_manager(auth.uid()));
create policy "insert own audit" on public.audit_logs for insert to authenticated with check (actor_id = auth.uid());

-- audit triggers for departments and settings
create or replace function public.audit_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, action, entity, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, coalesce((to_jsonb(new)->>'id'),(to_jsonb(old)->>'id')),
    jsonb_build_object('before', case when tg_op <> 'INSERT' then to_jsonb(old) end, 'after', case when tg_op <> 'DELETE' then to_jsonb(new) end));
  return coalesce(new, old);
end $$;
create trigger audit_departments after insert or update or delete on public.departments for each row execute function public.audit_change();
create trigger audit_settings after update on public.business_settings for each row execute function public.audit_change();
create trigger audit_profiles after update on public.profiles for each row execute function public.audit_change();

-- new user: profile + role (first user becomes owner)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email);
  if not exists (select 1 from public.user_roles where role = 'owner') then
    insert into public.user_roles(user_id, role) values (new.id, 'owner');
  else
    insert into public.user_roles(user_id, role) values (new.id, 'staff');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.departments(name, sort_order) values
('Administration',1),('Premix',2),('Store and Inventory',3),('Dispatch and Distribution',4),('Baking',5),('Mixing and Milling',6),('Moulding and Panning',7),('Packaging',8),('Cleaning and Hygiene',9),('Security',10),('Sales',11),('Accounting and Finance',12),('Human Resources and Payroll',13),('Reporting and Management',14);