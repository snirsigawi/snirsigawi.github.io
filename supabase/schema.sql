-- He:Bro — Supabase schema.
-- Run this in the Supabase SQL editor (or via `supabase db`) for a new project.
-- Single-user app: RLS allows any authenticated user; data is protected by login.

-- updated_at maintenance
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Students
create table students (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  name             text not null,
  age              int,
  age_range        text,
  city             text not null,
  country          text not null,
  status           text not null default 'active', -- active | archived
  lessons_location text,
  why_learning     text,
  what_for         text,
  birthday         date
);

create trigger students_set_updated_at
  before update on students
  for each row execute function set_updated_at();

-- Skill levels (one row per skill per student)
create table skill_levels (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  skill      text not null, -- reading | speaking | listening
  level      text not null, -- beginner | intermediate | advanced
  note       text,
  unique (student_id, skill)
);

-- Tags for a skill level (child table; unique per level)
create table skill_tags (
  id       uuid primary key default gen_random_uuid(),
  level_id uuid not null references skill_levels(id) on delete cascade,
  tag      text not null,
  unique (level_id, tag)
);

-- Special dates per student
create table special_dates (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date       date not null,
  label      text not null
);

-- Lessons
create table lessons (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references students(id) on delete cascade,
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  planned_topics    text,
  covered_topics    text,
  used_presentation boolean not null default false,
  last_slide_no     int,
  homework_assigned text,
  promised_next     text,
  homework_checked  boolean not null default false,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger lessons_set_updated_at
  before update on lessons
  for each row execute function set_updated_at();

-- Tutor-curated holidays
create table holidays (
  id   uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null
);

-- Row Level Security
alter table students enable row level security;
alter table skill_levels enable row level security;
alter table skill_tags enable row level security;
alter table special_dates enable row level security;
alter table lessons enable row level security;
alter table holidays enable row level security;

-- Policy: full access for any authenticated user (the app has exactly one user).
create policy "authenticated full access" on students
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on skill_levels
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on skill_tags
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on special_dates
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on lessons
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on holidays
  for all to authenticated using (true) with check (true);
