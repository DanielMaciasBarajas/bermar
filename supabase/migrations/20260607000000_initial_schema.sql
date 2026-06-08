-- ============================================================
-- BERAMAR COMMUNITY PLATFORM - COMPLETE DATABASE SCHEMA
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- COMMUNITIES
-- ============================================================
create table if not exists communities (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  address text,
  logo_url text,
  banner_url text,
  primary_color text default '#1a3d2b',
  total_apts_tbc integer default 73,
  apt_schema jsonb default '{"floors": 9, "doors": ["A","B","C","D","E","F","G","H","I","J"]}',
  duplex_floors integer[] default '{8}',
  languages_core text[] default '{CA,ES,EN,FR,RU}',
  languages_extended text[] default '{PT,IT,DE,NL,UK,SR,HI}',
  rental_min_months integer default 10,
  short_term_rental_allowed boolean default false,
  community_voice_enabled boolean default true,
  birthday_wishes_enabled boolean default true,
  moha_name text default 'Moha',
  moha_schedule text default 'Mon–Fri 08:00–14:00',
  moha_whatsapp text,
  on_call_enabled boolean default false,
  on_call_contact jsonb,
  liaison_email text,
  liaison_whatsapp text,
  admin_company_name text,
  admin_company_email text,
  admin_company_emergency_phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into communities (slug, name, address, primary_color, total_apts_tbc, moha_name, moha_schedule)
values ('beramar', 'Beramar', 'Avinguda d''Europa 6 & 8, Gavà Mar, 08850 Barcelona', '#1a3d2b', 73, 'Moha', 'Mon–Fri 08:00–14:00')
on conflict (slug) do nothing;

-- ============================================================
-- APARTMENTS
-- ============================================================
create table if not exists apartments (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  apt_number text not null,
  floor integer,
  door text,
  is_duplex boolean default false,
  duplex_upper_number text,
  created_at timestamptz default now(),
  unique(community_id, apt_number)
);

-- Insert all Beramar apartments (floors 1-9, doors A-J)
-- Using individual inserts with ON CONFLICT to avoid duplicates
do $$
declare
  cid uuid;
  f integer;
  d text;
  doors text[] := array['A','B','C','D','E','F','G','H','I','J'];
begin
  select id into cid from communities where slug = 'beramar';

  -- Floors 1-7: standard apartments
  for f in 1..7 loop
    foreach d in array doors loop
      insert into apartments (community_id, apt_number, floor, door, is_duplex, duplex_upper_number)
      values (cid, f::text || d, f, d, false, null)
      on conflict (community_id, apt_number) do nothing;
    end loop;
  end loop;

  -- Floor 8: duplex lower units (linked to 9th floor)
  foreach d in array doors loop
    insert into apartments (community_id, apt_number, floor, door, is_duplex, duplex_upper_number)
    values (cid, '8' || d, 8, d, true, '9' || d)
    on conflict (community_id, apt_number) do nothing;
  end loop;

  -- Floor 9: duplex upper units (linked to 8th floor)
  foreach d in array doors loop
    insert into apartments (community_id, apt_number, floor, door, is_duplex, duplex_upper_number)
    values (cid, '9' || d, 9, d, true, '8' || d)
    on conflict (community_id, apt_number) do nothing;
  end loop;
end $$;

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  community_id uuid references communities(id) on delete cascade,
  apartment_id uuid references apartments(id),
  apt_number text not null,
  username text unique,
  avatar_url text,
  phone text,
  role text default 'resident' check (role in ('resident', 'admin', 'sa')),
  show_names boolean default true,
  show_ages boolean default false,
  show_interests boolean default true,
  show_phone boolean default false,
  show_in_directory boolean default true,
  birthday_wishes boolean default true,
  email_notifications boolean default true,
  google_calendar_sync boolean default true,
  google_signin_enabled boolean default true,
  approved boolean default false,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- OCCUPANTS
-- ============================================================
create table if not exists occupants (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade,
  name text,
  gender text check (gender in ('M', 'F', '—')),
  age integer,
  birthday_day integer check (birthday_day between 1 and 31),
  birthday_month integer check (birthday_month between 1 and 12),
  is_primary boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- INTERESTS
-- ============================================================
create table if not exists interests (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade,
  interest text not null,
  created_at timestamptz default now(),
  unique(profile_id, interest)
);

-- ============================================================
-- PREMISES
-- ============================================================
create table if not exists premises (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  name text not null,
  name_translations jsonb default '{}',
  type text not null check (type in ('court', 'social', 'challenge')),
  booking_type text not null check (booking_type in ('slots', 'halfday', 'challenge')),
  slot_duration_minutes integer default 90,
  gap_required boolean default true,
  max_invite_slots integer,
  available_from time default '08:00',
  available_until time default '22:00',
  icon text default 'activity',
  active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

insert into premises (community_id, name, name_translations, type, booking_type, slot_duration_minutes, gap_required, max_invite_slots, icon, sort_order)
select c.id, p.name, p.translations::jsonb, p.type, p.booking_type, p.slot_mins, p.gap_req, p.max_inv, p.icon, p.sort
from communities c
cross join (values
  ('Tennis court', '{"CA":"Pista de tennis","ES":"Pista de tenis"}', 'court', 'slots', 90, true, 3, 'tennis', 1),
  ('Padel court', '{"CA":"Pista de padel","ES":"Pista de padel"}', 'court', 'slots', 90, true, 3, 'padel', 2),
  ('Football 5', '{"CA":"Futbol 5","ES":"Futbol 5"}', 'court', 'slots', 90, true, 9, 'football', 3),
  ('Basketball', '{"CA":"Basquet","ES":"Baloncesto"}', 'court', 'slots', 90, true, 9, 'basketball', 4),
  ('Ping pong', '{"CA":"Ping-pong","ES":"Ping-pong"}', 'court', 'slots', 90, true, 3, 'ping-pong', 5),
  ('BBQ area', '{"CA":"Zona barbacoa","ES":"Zona barbacoa"}', 'social', 'halfday', 0, false, null, 'bbq', 6),
  ('Party room', '{"CA":"Sala de festes","ES":"Sala de fiestas"}', 'social', 'halfday', 0, false, null, 'party', 7),
  ('Chess / Escacs', '{"CA":"Escacs","ES":"Ajedrez"}', 'challenge', 'challenge', 0, false, 1, 'chess', 8)
) as p(name, translations, type, booking_type, slot_mins, gap_req, max_inv, icon, sort)
where c.slug = 'beramar'
on conflict do nothing;

-- ============================================================
-- BOOKINGS
-- ============================================================
create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  premise_id uuid references premises(id),
  profile_id uuid references profiles(id),
  apt_number text not null,
  date date not null,
  slot_start time,
  slot_end time,
  halfday_period text check (halfday_period in ('morning', 'afternoon', 'evening', 'full')),
  status text default 'confirmed' check (status in ('confirmed', 'cancelled')),
  invite_open boolean default false,
  invite_scope text default 'none' check (invite_scope in ('none', 'interest', 'apt', 'all')),
  invite_target_apt text,
  invite_max_slots integer,
  google_event_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- BOOKING PARTICIPANTS
-- ============================================================
create table if not exists booking_participants (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id) on delete cascade,
  profile_id uuid references profiles(id),
  apt_number text not null,
  joined_at timestamptz default now(),
  unique(booking_id, profile_id)
);

-- ============================================================
-- PROPOSALS
-- ============================================================
create table if not exists proposals (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  profile_id uuid references profiles(id),
  apt_number text not null,
  title text not null,
  body text not null,
  body_translations jsonb default '{}',
  category text not null check (category in ('social','infrastructure','rules','complaint','project','meeting','other')),
  status text default 'open' check (status in ('open','voting','resolved','archived','promoted')),
  voting_closes_at timestamptz,
  tagged_apts text[] default '{}',
  tag_all boolean default false,
  supports integer default 0,
  against integer default 0,
  promoted_to_project_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PROPOSAL VOTES
-- ============================================================
create table if not exists proposal_votes (
  id uuid primary key default uuid_generate_v4(),
  proposal_id uuid references proposals(id) on delete cascade,
  profile_id uuid references profiles(id),
  vote text check (vote in ('support', 'against')),
  created_at timestamptz default now(),
  unique(proposal_id, profile_id)
);

-- ============================================================
-- PROPOSAL FLAGS
-- ============================================================
create table if not exists proposal_flags (
  id uuid primary key default uuid_generate_v4(),
  proposal_id uuid references proposals(id) on delete cascade,
  profile_id uuid references profiles(id),
  is_important boolean default false,
  is_following boolean default false,
  is_dismissed boolean default false,
  last_read_at timestamptz,
  unique(proposal_id, profile_id)
);

-- ============================================================
-- COMMENTS
-- ============================================================
create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  entity_type text not null check (entity_type in ('proposal', 'booking', 'marketplace')),
  entity_id uuid not null,
  profile_id uuid references profiles(id),
  apt_number text not null,
  body text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- MARKETPLACE
-- ============================================================
create table if not exists marketplace_listings (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  profile_id uuid references profiles(id),
  apt_number text not null,
  category text not null check (category in ('favour','advice','borrow','buy_sell_donate','parking','apartment_rental','apartment_sale','babysitting','language_exchange')),
  title text not null,
  body text not null,
  body_translations jsonb default '{}',
  photo_url text,
  price_eur integer,
  rental_months_min integer,
  language_from text,
  language_to text,
  status text default 'active' check (status in ('active', 'closed', 'expired')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  title text not null,
  category text not null check (category in ('statutes','minutes','contracts','projects','urban','other')),
  uploaded_by uuid references profiles(id),
  translations jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists document_files (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references documents(id) on delete cascade,
  language text not null,
  file_url text not null,
  file_name text,
  uploaded_at timestamptz default now(),
  unique(document_id, language)
);

-- ============================================================
-- PROJECTS
-- ============================================================
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  origin_proposal_id uuid references proposals(id),
  title text not null,
  description text,
  status text default 'planning' check (status in ('planning','tendering','in_progress','on_hold','completed')),
  projected_cost_eur integer,
  actual_cost_eur integer,
  provider_name text,
  provider_contact text,
  contract_document_id uuid references documents(id),
  start_date date,
  estimated_completion date,
  completion_date date,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_updates (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  posted_by uuid references profiles(id),
  body text not null,
  photo_urls text[] default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- MAINTENANCE TICKETS
-- ============================================================
create table if not exists maintenance_tickets (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  profile_id uuid references profiles(id),
  apt_number text not null,
  category text not null check (category in ('common_areas','pool_garden','elevator','parking','structure','noise','insurance','internal','other')),
  location_description text,
  description text not null,
  urgency text default 'normal' check (urgency in ('normal','urgent','emergency')),
  photo_urls text[] default '{}',
  insurance_flag boolean default false,
  status text default 'submitted' check (status in ('submitted','forwarded','in_progress','resolved')),
  liaison_notes text,
  whatsapp_sent_moha boolean default false,
  whatsapp_sent_liaison boolean default false,
  email_sent_liaison boolean default false,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ADMIN ANNOUNCEMENTS
-- ============================================================
create table if not exists admin_announcements (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  posted_by uuid references profiles(id),
  type text not null check (type in ('warning','announcement','convocatoria')),
  title text not null,
  body text,
  meeting_date timestamptz,
  meeting_location text,
  meeting_type text check (meeting_type in ('ordinary','extraordinary')),
  pdf_url text,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists announcement_dismissals (
  announcement_id uuid references admin_announcements(id) on delete cascade,
  profile_id uuid references profiles(id),
  dismissed_at timestamptz default now(),
  primary key (announcement_id, profile_id)
);

-- ============================================================
-- COMMUNITY VOICE
-- ============================================================
create table if not exists community_voice (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  trigger_type text not null check (trigger_type in ('birthday','new_neighbour','milestone','proposal_milestone','marketplace_quirk','event_completed')),
  body jsonb not null default '{}',
  entity_id uuid,
  created_at timestamptz default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  profile_id uuid references profiles(id),
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- EMERGENCY CONTACTS
-- ============================================================
create table if not exists emergency_contacts (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  name text not null,
  role text not null,
  phone text,
  available_hours text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

insert into emergency_contacts (community_id, name, role, phone, available_hours, sort_order)
select c.id, e.name, e.role, e.phone, e.hours, e.sort
from communities c
cross join (values
  ('Moha', 'Maintenance', '', 'Mon–Fri 08:00–14:00', 1),
  ('Community Liaison', 'Liaison', '', 'Business hours', 2),
  ('Admin company — emergency', 'Admin', '', '24h', 3),
  ('Emergency services', '112 / 091 / 080 / 061', '112', '24h', 4)
) as e(name, role, phone, hours, sort)
where c.slug = 'beramar'
on conflict do nothing;

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
create table if not exists activity_log (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid references communities(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table communities enable row level security;
alter table apartments enable row level security;
alter table profiles enable row level security;
alter table occupants enable row level security;
alter table interests enable row level security;
alter table premises enable row level security;
alter table bookings enable row level security;
alter table booking_participants enable row level security;
alter table proposals enable row level security;
alter table proposal_votes enable row level security;
alter table proposal_flags enable row level security;
alter table comments enable row level security;
alter table marketplace_listings enable row level security;
alter table documents enable row level security;
alter table document_files enable row level security;
alter table projects enable row level security;
alter table project_updates enable row level security;
alter table maintenance_tickets enable row level security;
alter table admin_announcements enable row level security;
alter table announcement_dismissals enable row level security;
alter table community_voice enable row level security;
alter table notifications enable row level security;
alter table emergency_contacts enable row level security;
alter table activity_log enable row level security;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
create or replace function get_my_community_id()
returns uuid language sql security definer as $$
  select community_id from profiles where id = auth.uid()
$$;

create or replace function get_my_role()
returns text language sql security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Communities
create policy "see own community" on communities
  for select using (id = get_my_community_id() or get_my_role() = 'sa');

-- Apartments
create policy "see community apartments" on apartments
  for select using (community_id = get_my_community_id());

-- Profiles
create policy "see approved profiles" on profiles
  for select using (community_id = get_my_community_id() and approved = true);
create policy "see own profile" on profiles
  for select using (id = auth.uid());
create policy "insert own profile" on profiles
  for insert with check (id = auth.uid());
create policy "update own profile" on profiles
  for update using (id = auth.uid());
create policy "admin sees all" on profiles
  for select using (get_my_role() in ('admin','sa'));
create policy "admin updates profiles" on profiles
  for update using (get_my_role() in ('admin','sa'));

-- Occupants
create policy "see occupants" on occupants
  for select using (profile_id in (select id from profiles where community_id = get_my_community_id() and approved = true));
create policy "own occupants" on occupants
  for all using (profile_id = auth.uid());

-- Interests
create policy "see interests" on interests
  for select using (profile_id in (select id from profiles where community_id = get_my_community_id() and approved = true));
create policy "own interests" on interests
  for all using (profile_id = auth.uid());

-- Premises
create policy "see premises" on premises
  for select using (community_id = get_my_community_id());

-- Bookings
create policy "see bookings" on bookings
  for select using (community_id = get_my_community_id());
create policy "create booking" on bookings
  for insert with check (profile_id = auth.uid() and community_id = get_my_community_id());
create policy "update own booking" on bookings
  for update using (profile_id = auth.uid());

-- Booking participants
create policy "see participants" on booking_participants
  for select using (booking_id in (select id from bookings where community_id = get_my_community_id()));
create policy "join booking" on booking_participants
  for insert with check (profile_id = auth.uid());
create policy "leave booking" on booking_participants
  for delete using (profile_id = auth.uid());

-- Proposals
create policy "see proposals" on proposals
  for select using (community_id = get_my_community_id());
create policy "create proposal" on proposals
  for insert with check (profile_id = auth.uid() and community_id = get_my_community_id());
create policy "update own proposal" on proposals
  for update using (profile_id = auth.uid());

-- Votes and flags
create policy "see votes" on proposal_votes for select using (true);
create policy "own vote" on proposal_votes for all using (profile_id = auth.uid());
create policy "own flags" on proposal_flags for all using (profile_id = auth.uid());

-- Comments
create policy "see comments" on comments
  for select using (community_id = get_my_community_id());
create policy "create comment" on comments
  for insert with check (profile_id = auth.uid() and community_id = get_my_community_id());

-- Marketplace
create policy "see listings" on marketplace_listings
  for select using (community_id = get_my_community_id() and status = 'active');
create policy "create listing" on marketplace_listings
  for insert with check (profile_id = auth.uid() and community_id = get_my_community_id());
create policy "update own listing" on marketplace_listings
  for update using (profile_id = auth.uid());

-- Documents
create policy "see documents" on documents
  for select using (community_id = get_my_community_id());
create policy "admin uploads docs" on documents
  for insert with check (get_my_role() in ('admin','sa'));
create policy "see doc files" on document_files
  for select using (document_id in (select id from documents where community_id = get_my_community_id()));
create policy "admin uploads files" on document_files
  for insert with check (get_my_role() in ('admin','sa'));

-- Projects
create policy "see projects" on projects
  for select using (community_id = get_my_community_id());
create policy "admin manages projects" on projects
  for all using (get_my_role() in ('admin','sa'));
create policy "see updates" on project_updates
  for select using (project_id in (select id from projects where community_id = get_my_community_id()));
create policy "admin posts updates" on project_updates
  for insert with check (get_my_role() in ('admin','sa'));

-- Maintenance
create policy "see own tickets" on maintenance_tickets
  for select using (profile_id = auth.uid() or get_my_role() in ('admin','sa'));
create policy "create ticket" on maintenance_tickets
  for insert with check (profile_id = auth.uid() and community_id = get_my_community_id());
create policy "admin updates tickets" on maintenance_tickets
  for update using (get_my_role() in ('admin','sa'));

-- Announcements
create policy "see announcements" on admin_announcements
  for select using (community_id = get_my_community_id() and active = true);
create policy "admin creates announcements" on admin_announcements
  for insert with check (get_my_role() in ('admin','sa'));
create policy "dismissals" on announcement_dismissals
  for all using (profile_id = auth.uid());

-- Community voice
create policy "see voice" on community_voice
  for select using (community_id = get_my_community_id());

-- Notifications
create policy "own notifications" on notifications
  for all using (profile_id = auth.uid());

-- Emergency contacts
create policy "see emergency contacts" on emergency_contacts
  for select using (community_id = get_my_community_id());
create policy "admin manages contacts" on emergency_contacts
  for all using (get_my_role() in ('admin','sa'));

-- Activity log
create policy "admin sees log" on activity_log
  for select using (get_my_role() in ('admin','sa') and community_id = get_my_community_id());

-- ============================================================
-- TRIGGERS
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on profiles
  for each row execute function update_updated_at();
create trigger trg_bookings_updated before update on bookings
  for each row execute function update_updated_at();
create trigger trg_proposals_updated before update on proposals
  for each row execute function update_updated_at();
create trigger trg_marketplace_updated before update on marketplace_listings
  for each row execute function update_updated_at();
create trigger trg_maintenance_updated before update on maintenance_tickets
  for each row execute function update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_profiles_community on profiles(community_id);
create index if not exists idx_bookings_community_date on bookings(community_id, date);
create index if not exists idx_bookings_premise on bookings(premise_id, date);
create index if not exists idx_proposals_community on proposals(community_id, status);
create index if not exists idx_marketplace_community on marketplace_listings(community_id, status);
create index if not exists idx_notifications_profile on notifications(profile_id, read);
create index if not exists idx_maintenance_community on maintenance_tickets(community_id, status);
create index if not exists idx_activity_community on activity_log(community_id, created_at desc);
