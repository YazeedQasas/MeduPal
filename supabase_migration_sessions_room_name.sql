-- Optional legacy column (prefer sessions.station_id → stations.name / room_number)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS room_name text;

-- Ensure instructors can create exam station rows when assigning exams
-- (run enable_stations_rls.sql if insert on stations fails)
