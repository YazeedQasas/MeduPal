-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Users/Faculty)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text check (role in ('admin', 'faculty', 'technician', 'student')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. MANIKINS
create table manikins (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text check (type in ('Adult', 'Pediatric', 'Birthing', 'SimMom')),
  serial_number text,
  status text check (status in ('Active', 'Maintenance', 'Offline')) default 'Active',
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. STUDENTS
create table students (
  id uuid default uuid_generate_v4() primary key,
  student_identifier text unique not null,
  full_name text not null,
  email text,
  year_level text,
  assigned_professor_id uuid references profiles(id),
  status text check (status in ('Online', 'Offline', 'In Session')) default 'Offline',
  last_activity timestamp with time zone,
  avg_score numeric(5, 2) default 0,
  total_sessions int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. CASES (Scenarios)
create table cases (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  category text,
  difficulty text check (difficulty in ('Easy', 'Intermediate', 'Hard')),
  duration_minutes int,
  author_id uuid references profiles(id),
  status text check (status in ('Draft', 'Published', 'Archived')) default 'Draft',
  rating numeric(3, 1) default 0,
  content jsonb, -- Stores steps, objectives, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. STATIONS (Rooms)
create table stations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  room_number text,
  current_manikin_id uuid references manikins(id),
  status text check (status in ('Available', 'Occupied', 'Cleaning', 'Maintenance')) default 'Available',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. SESSIONS (Clinical Events)
create table sessions (
  id uuid default uuid_generate_v4() primary key,
  station_id uuid references stations(id),
  case_id uuid references cases(id),
  student_id uuid references students(id),
  examiner_id uuid references profiles(id),
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  status text check (status in ('Scheduled', 'In Progress', 'Completed', 'Cancelled')) default 'Scheduled',
  score int check (score >= 0 and score <= 100),
  feedback_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. EVENTS (Session Logs/Timeline)
create table session_events (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references sessions(id) on delete cascade,
  event_type text, -- e.g., 'Drug Administered', 'Vitals Check'
  description text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. CONTROLLERS (ESP32 Hardware)
create table controllers (
  id text primary key, -- e.g. "ESP-01"
  name text,
  ip_address text,
  battery_level int,
  status text check (status in ('Online', 'Offline', 'Warning')) default 'Offline',
  last_seen timestamp with time zone,
  station_id uuid references stations(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. SENSORS
create table sensors (
  id text primary key, -- e.g. "SEN-A1"
  controller_id text references controllers(id),
  type text, -- 'Pulse', 'Lung', 'Heart', 'Mic'
  value jsonb, -- Stores dynamic values like {"bpm": 72}
  status text check (status in ('Active', 'Error', 'Idle')) default 'Active',
  update_interval_ms int default 1000,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. ALERTS
create table alerts (
  id uuid default uuid_generate_v4() primary key,
  type text check (type in ('critical', 'warning', 'success', 'info')),
  message text not null,
  source_id text, -- Flexible reference to device or room ID
  is_acknowledged boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PERFORMANCE METRICS VIEW (Simplified Analytics)
create or replace view performance_metrics as
select 
  c.category,
  avg(s.score) as avg_score,
  count(s.id) filter (where s.score < 60) as fail_count,
  count(s.id) as total_attempts
from sessions s
join cases c on s.case_id = c.id
where s.status = 'Completed'
group by c.category;

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table manikins enable row level security;
alter table students enable row level security;
alter table cases enable row level security;
alter table stations enable row level security;
alter table sessions enable row level security;
alter table controllers enable row level security;
alter table sensors enable row level security;
alter table alerts enable row level security;

-- Create policies (Allow read access for authenticated users for now)
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);

create policy "Enable read access for all tables" on manikins for select using (true);
create policy "Enable read access for all tables" on students for select using (true);
create policy "Enable read access for all tables" on cases for select using (true);
create policy "Enable read access for all tables" on stations for select using (true);
create policy "Enable read access for all tables" on sessions for select using (true);
create policy "Enable read access for all tables" on controllers for select using (true);
create policy "Enable read access for all tables" on sensors for select using (true);
create policy "Enable read access for all tables" on alerts for select using (true);
