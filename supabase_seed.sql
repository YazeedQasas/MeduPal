-- Seed Data for MeduPal
-- Run this in the Supabase SQL Editor AFTER running the schema script.

-- 1. Create a Faculty User (Change the ID if you already have a real user)
-- Note: In a real app, users are created via Auth, but we'll mock a profile here.
-- You might need to manually insert a row in `auth.users` first if you want login to work for this ID,
-- or just use a placeholder UUID for now.
DO $$
DECLARE
  faculty_id uuid := uuid_generate_v4();
  manikin_id_1 uuid;
  manikin_id_2 uuid;
  case_id_1 uuid;
  case_id_2 uuid;
  student_id_1 uuid;
  student_id_2 uuid;
  station_id_1 uuid;
  station_id_2 uuid;
  session_id_1 uuid;
BEGIN
  -- 1. Get a valid User ID
  -- ideally from auth.users, so we can create a profile for them
  SELECT id INTO faculty_id FROM auth.users LIMIT 1;

  IF faculty_id IS NULL THEN
    -- If no user exists, we cannot proceed because of foreign key constraints
    RAISE EXCEPTION 'No user found in auth.users. Please sign up a user in your Supabase Authentication dashboard first, then run this script again.';
  END IF;

  -- 2. Ensure Profile Exists for this User
  INSERT INTO profiles (id, email, full_name, role, avatar_url)
  VALUES (
    faculty_id, 
    (SELECT email FROM auth.users WHERE id = faculty_id), 
    'Dr. Sarah Smith', 
    'faculty', 
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  )
  ON CONFLICT (id) DO UPDATE 
  SET full_name = 'Dr. Sarah Smith', role = 'faculty';

  -- Insert Manikins
  INSERT INTO manikins (name, type, serial_number, status, ip_address)
  VALUES ('SimMan 3G Plus', 'Adult', 'SM3G-001', 'Active', '192.168.1.101')
  RETURNING id INTO manikin_id_1;

  INSERT INTO manikins (name, type, serial_number, status, ip_address)
  VALUES ('SimJunior', 'Pediatric', 'SJ-002', 'Maintenance', '192.168.1.102')
  RETURNING id INTO manikin_id_2;

  -- Insert Students
  INSERT INTO students (student_identifier, full_name, email, year_level, assigned_professor_id, status, last_activity, avg_score, total_sessions)
  VALUES 
  ('STU-1001', 'Alex Johnson', 'alex.j@university.edu', 'Year 4', faculty_id, 'Online', NOW(), 88.5, 12)
  RETURNING id INTO student_id_1;

  INSERT INTO students (student_identifier, full_name, email, year_level, assigned_professor_id, status, last_activity, avg_score, total_sessions)
  VALUES 
  ('STU-1002', 'Samantha Lee', 's.lee@university.edu', 'Year 3', faculty_id, 'Offline', NOW() - INTERVAL '2 hours', 92.0, 8)
  RETURNING id INTO student_id_2;

  -- Insert Cases
  INSERT INTO cases (title, category, difficulty, duration_minutes, author_id, status, rating)
  VALUES 
  ('Acute Myocardial Infarction', 'Cardiology', 'Hard', 15, faculty_id, 'Published', 4.8)
  RETURNING id INTO case_id_1;

  INSERT INTO cases (title, category, difficulty, duration_minutes, author_id, status, rating)
  VALUES 
  ('Pediatric Asthma Attack', 'Pediatrics', 'Intermediate', 20, faculty_id, 'Published', 4.5)
  RETURNING id INTO case_id_2;

  -- Insert Stations
  INSERT INTO stations (name, room_number, current_manikin_id, status)
  VALUES ('Trauma Bay 1', '101', manikin_id_1, 'Occupied')
  RETURNING id INTO station_id_1;

  INSERT INTO stations (name, room_number, current_manikin_id, status)
  VALUES ('Pediatric ICU', '102', manikin_id_2, 'Available')
  RETURNING id INTO station_id_2;

  -- Insert Hardware Controllers (ESP32)
  INSERT INTO controllers (id, name, ip_address, battery_level, status, last_seen, station_id)
  VALUES 
  ('ESP-01', 'Main Controller', '192.168.1.50', 98, 'Online', NOW(), station_id_1),
  ('ESP-02', 'Sensor Integration Hub', '192.168.1.51', 45, 'Warning', NOW(), station_id_1);

  -- Insert Sensors
  INSERT INTO sensors (id, controller_id, type, value, status)
  VALUES 
  ('SEN-A1', 'ESP-01', 'Lung', '{"resp_rate": 18, "sound": "Clear"}', 'Active'),
  ('SEN-A2', 'ESP-01', 'Heart', '{"bpm": 72, "rhythm": "Sinus"}', 'Active'),
  ('SEN-B1', 'ESP-02', 'Mic', '{"db": 45}', 'Active');

  -- Insert Sessions (One active, one completed)
  INSERT INTO sessions (station_id, case_id, student_id, examiner_id, start_time, end_time, status, score, feedback_notes)
  VALUES 
  (station_id_1, case_id_1, student_id_1, faculty_id, NOW() - INTERVAL '10 minutes', NULL, 'In Progress', NULL, NULL);

  INSERT INTO sessions (station_id, case_id, student_id, examiner_id, start_time, end_time, status, score, feedback_notes)
  VALUES 
  (station_id_1, case_id_2, student_id_2, faculty_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', 'Completed', 92, 'Excellent handling of the patient.');

  -- Insert Alerts
  INSERT INTO alerts (type, message, source_id, is_acknowledged)
  VALUES 
  ('critical', 'Room 101: O2 Saturation Critically Low', 'ESP-01', false),
  ('warning', 'ESP-02 Battery Low (45%)', 'ESP-02', false);

END $$;
