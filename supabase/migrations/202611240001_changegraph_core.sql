-- ChangeGraph enterprise workspace schema
-- Run in Supabase SQL Editor or via `supabase db push`.
create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('workspace_admin','product_owner','engineer','qa_analyst','business_stakeholder','technical_writer')),
  display_name text,
  created_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);

create table if not exists public.components (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  component_key text not null,
  name text not null,
  component_type text,
  owner text,
  status text not null default 'Stable',
  description text,
  risk text,
  risk_text text,
  primary key (workspace_id,component_key)
);

create table if not exists public.component_dependencies (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_component text not null,
  target_component text not null,
  dependency_type text not null default 'runtime',
  notes text,
  primary key (workspace_id,source_component,target_component),
  foreign key (workspace_id,source_component) references public.components(workspace_id,component_key) on delete cascade,
  foreign key (workspace_id,target_component) references public.components(workspace_id,component_key) on delete cascade,
  check (source_component <> target_component)
);

create table if not exists public.requirements (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  title text not null,
  description text not null,
  component_key text not null,
  priority text not null check (priority in ('Critical','High','Medium','Low')),
  status text not null check (status in ('Draft','In progress','In review','Approved')),
  owner text,
  criteria jsonb not null default '[]'::jsonb,
  test_ids jsonb not null default '[]'::jsonb,
  created_label text,
  requester text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id,id),
  foreign key (workspace_id,component_key) references public.components(workspace_id,component_key)
);
create index if not exists requirements_workspace_status_idx on public.requirements(workspace_id,status,priority);

create table if not exists public.backlog_items (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  title text not null,
  requirement_id text not null,
  status text not null check (status in ('To do','In progress','In review','Done','Blocked')),
  priority text not null check (priority in ('Critical','High','Medium','Low')),
  owner text,
  points integer not null default 3 check (points between 1 and 100),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id,id),
  foreign key (workspace_id,requirement_id) references public.requirements(workspace_id,id) on delete cascade
);
create index if not exists backlog_workspace_status_idx on public.backlog_items(workspace_id,status,priority);

create table if not exists public.qa_test_cases (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  name text not null,
  requirement_id text not null,
  component_key text not null,
  result text not null check (result in ('Passed','Failed','Not run')),
  owner text,
  last_run text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id,id),
  foreign key (workspace_id,requirement_id) references public.requirements(workspace_id,id) on delete cascade,
  foreign key (workspace_id,component_key) references public.components(workspace_id,component_key)
);

create table if not exists public.workspace_preferences (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  docs_approved boolean not null default false,
  selected_doc text not null default 'release' check (selected_doc in ('release','guide','api','demo')),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_documents (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  document_key text not null check (document_key in ('release','guide','api','demo')),
  title text not null,
  markdown text not null,
  version integer not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (workspace_id,document_key)
);

create table if not exists public.activity_events (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  initials text,
  content text not null,
  display_time text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (workspace_id,id)
);

-- SECURITY DEFINER helpers avoid recursive RLS when membership is checked.
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.workspace_members m where m.workspace_id=target_workspace and m.user_id=auth.uid()) $$;

create or replace function public.has_workspace_role(target_workspace uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.workspace_members m where m.workspace_id=target_workspace and m.user_id=auth.uid() and m.role=any(allowed_roles)) $$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.components enable row level security;
alter table public.component_dependencies enable row level security;
alter table public.requirements enable row level security;
alter table public.backlog_items enable row level security;
alter table public.qa_test_cases enable row level security;
alter table public.workspace_preferences enable row level security;
alter table public.workspace_documents enable row level security;
alter table public.activity_events enable row level security;

-- Workspaces and memberships
 drop policy if exists "workspace members can read workspace" on public.workspaces;
create policy "workspace members can read workspace" on public.workspaces for select using (public.is_workspace_member(id));
drop policy if exists "members can view own membership and admins can view all" on public.workspace_members;
create policy "members can view own membership and admins can view all" on public.workspace_members for select using (user_id=auth.uid() or public.has_workspace_role(workspace_id,array['workspace_admin']));
drop policy if exists "workspace admins manage memberships" on public.workspace_members;
create policy "workspace admins manage memberships" on public.workspace_members for all using (public.has_workspace_role(workspace_id,array['workspace_admin'])) with check (public.has_workspace_role(workspace_id,array['workspace_admin']));

-- Components and dependency catalogue are workspace-readable; only admins maintain them.
drop policy if exists "members read components" on public.components;
create policy "members read components" on public.components for select using (public.is_workspace_member(workspace_id));
drop policy if exists "admins manage components" on public.components;
create policy "admins manage components" on public.components for all using (public.has_workspace_role(workspace_id,array['workspace_admin'])) with check (public.has_workspace_role(workspace_id,array['workspace_admin']));
drop policy if exists "members read dependencies" on public.component_dependencies;
create policy "members read dependencies" on public.component_dependencies for select using (public.is_workspace_member(workspace_id));
drop policy if exists "admins manage dependencies" on public.component_dependencies;
create policy "admins manage dependencies" on public.component_dependencies for all using (public.has_workspace_role(workspace_id,array['workspace_admin'])) with check (public.has_workspace_role(workspace_id,array['workspace_admin']));

-- Requirement editing is a Product Owner responsibility. Business users may submit new Draft requests.
drop policy if exists "members read requirements" on public.requirements;
create policy "members read requirements" on public.requirements for select using (public.is_workspace_member(workspace_id));
drop policy if exists "product owners create requirements" on public.requirements;
create policy "product owners create requirements" on public.requirements for insert with check (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner']) or (status='Draft' and public.has_workspace_role(workspace_id,array['business_stakeholder'])));
drop policy if exists "product owners update requirements" on public.requirements;
create policy "product owners update requirements" on public.requirements for update using (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner'])) with check (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner']));
drop policy if exists "product owners delete requirements" on public.requirements;
create policy "product owners delete requirements" on public.requirements for delete using (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner']));

-- Engineers and Product Owners manage backlog; read access is available to all workspace members.
drop policy if exists "members read backlog" on public.backlog_items;
create policy "members read backlog" on public.backlog_items for select using (public.is_workspace_member(workspace_id));
drop policy if exists "engineering roles create backlog" on public.backlog_items;
create policy "engineering roles create backlog" on public.backlog_items for insert with check (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner','engineer']));
drop policy if exists "engineering roles update backlog" on public.backlog_items;
create policy "engineering roles update backlog" on public.backlog_items for update using (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner','engineer'])) with check (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner','engineer']));
drop policy if exists "owners delete backlog" on public.backlog_items;
create policy "owners delete backlog" on public.backlog_items for delete using (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner']));

-- QA Analysts own test execution. Product Owners may administer test cases.
drop policy if exists "members read QA" on public.qa_test_cases;
create policy "members read QA" on public.qa_test_cases for select using (public.is_workspace_member(workspace_id));
drop policy if exists "QA roles insert test cases" on public.qa_test_cases;
create policy "QA roles insert test cases" on public.qa_test_cases for insert with check (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner','qa_analyst']));
drop policy if exists "QA roles update test cases" on public.qa_test_cases;
create policy "QA roles update test cases" on public.qa_test_cases for update using (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner','qa_analyst'])) with check (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner','qa_analyst']));

-- Preferences are controlled by Product Owners/Admins; documents are maintained by Writers and Product Owners.
drop policy if exists "members read preferences" on public.workspace_preferences;
create policy "members read preferences" on public.workspace_preferences for select using (public.is_workspace_member(workspace_id));
drop policy if exists "owners update preferences" on public.workspace_preferences;
create policy "owners update preferences" on public.workspace_preferences for all using (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner'])) with check (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner']));
drop policy if exists "members read documents" on public.workspace_documents;
create policy "members read documents" on public.workspace_documents for select using (public.is_workspace_member(workspace_id));
drop policy if exists "writers maintain documents" on public.workspace_documents;
create policy "writers maintain documents" on public.workspace_documents for all using (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner','technical_writer'])) with check (public.has_workspace_role(workspace_id,array['workspace_admin','product_owner','technical_writer']));

-- Activity feed is append/update accessible to members; records remain scoped to their workspace.
drop policy if exists "members read activity" on public.activity_events;
create policy "members read activity" on public.activity_events for select using (public.is_workspace_member(workspace_id));
drop policy if exists "members write activity" on public.activity_events;
create policy "members write activity" on public.activity_events for insert with check (public.is_workspace_member(workspace_id));

-- Seed the demo enterprise workspace and component catalogue.
insert into public.workspaces(id,name,slug) values
('11111111-1111-4111-8111-111111111111','Retail Banking','retail-banking-changegraph')
on conflict (id) do nothing;
insert into public.workspace_preferences(workspace_id) values ('11111111-1111-4111-8111-111111111111') on conflict (workspace_id) do nothing;
insert into public.components(workspace_id,component_key,name,component_type,owner,status,description,risk,risk_text) values
('11111111-1111-4111-8111-111111111111','onboarding-ui','Onboarding UI','FRONTEND APPLICATION','Digital Channels','Stable','Captures applicant information, consent and onboarding journey.','High','Changes affect validation, session state and downstream payload contracts.'),
('11111111-1111-4111-8111-111111111111','kyc-service','KYC Service','DOMAIN SERVICE','Identity Platform','Attention','Orchestrates identity verification and returns per-applicant outcomes.','High','Retries and partial outcomes must remain idempotent and independently traceable.'),
('11111111-1111-4111-8111-111111111111','customer-profile','Customer Profile','CORE DOMAIN','Customer Data','Stable','Maintains unique customer identities, relationship links and consent records.','Medium','Joint ownership must not merge or overwrite either applicant identity.'),
('11111111-1111-4111-8111-111111111111','document-service','Document Service','PLATFORM SERVICE','Content & Records','Stable','Stores applicant-level documents and retention metadata.','Medium','Document ownership and access policies must remain applicant-specific.'),
('11111111-1111-4111-8111-111111111111','core-banking','Core Banking API','EXTERNAL SYSTEM','Core Platforms','Attention','Creates accounts after applicant and ownership validations.','Critical','Duplicate requests or partial payloads can create financial inconsistencies.'),
('11111111-1111-4111-8111-111111111111','notification-service','Notification Service','PLATFORM SERVICE','Customer Engagement','Stable','Delivers transactional email and SMS updates.','Low','Recipient logic must handle two applicants without leaking sensitive information.'),
('11111111-1111-4111-8111-111111111111','audit-ledger','Audit Ledger','CONTROL & COMPLIANCE','Risk Technology','Stable','Records application, verification, consent and account events.','High','Events must be complete, immutable and correlated across components.')
on conflict (workspace_id,component_key) do nothing;
insert into public.component_dependencies(workspace_id,source_component,target_component,dependency_type) values
('11111111-1111-4111-8111-111111111111','onboarding-ui','kyc-service','synchronous API'),
('11111111-1111-4111-8111-111111111111','onboarding-ui','customer-profile','synchronous API'),
('11111111-1111-4111-8111-111111111111','onboarding-ui','document-service','synchronous API'),
('11111111-1111-4111-8111-111111111111','kyc-service','customer-profile','domain event'),
('11111111-1111-4111-8111-111111111111','kyc-service','audit-ledger','event'),
('11111111-1111-4111-8111-111111111111','customer-profile','core-banking','synchronous API'),
('11111111-1111-4111-8111-111111111111','customer-profile','audit-ledger','event'),
('11111111-1111-4111-8111-111111111111','document-service','audit-ledger','event'),
('11111111-1111-4111-8111-111111111111','document-service','kyc-service','domain event'),
('11111111-1111-4111-8111-111111111111','core-banking','audit-ledger','event'),
('11111111-1111-4111-8111-111111111111','core-banking','notification-service','event'),
('11111111-1111-4111-8111-111111111111','notification-service','audit-ledger','event')
on conflict do nothing;


-- Data API privileges. RLS policies above remain the effective access boundary.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.components to authenticated;
grant select, insert, update, delete on public.component_dependencies to authenticated;
grant select, insert, update, delete on public.requirements to authenticated;
grant select, insert, update, delete on public.backlog_items to authenticated;
grant select, insert, update, delete on public.qa_test_cases to authenticated;
grant select, insert, update, delete on public.workspace_preferences to authenticated;
grant select, insert, update, delete on public.workspace_documents to authenticated;
grant select, insert on public.activity_events to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid,text[]) to authenticated;
