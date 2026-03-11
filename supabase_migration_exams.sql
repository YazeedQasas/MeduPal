-- Migration: Create exams table for instructor-assigned exams
CREATE TABLE IF NOT EXISTS exams (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  case_name text NOT NULL,
  station_id uuid REFERENCES stations(id) ON DELETE SET NULL,
  exam_date timestamp with time zone NOT NULL,
  notes text,
  status text CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users" ON exams FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert for instructors" ON exams FOR INSERT
  WITH CHECK (
    auth.uid() = instructor_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'instructor'))
  );
CREATE POLICY "Allow update for instructors" ON exams FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'instructor')));
CREATE POLICY "Allow delete for instructors" ON exams FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'instructor')));
