-- Fix exam sessions not showing on My Exam (session_type column only — no sessions.type)

-- Run once in Supabase SQL editor.



update sessions

set session_type = 'exam'

where status in ('Scheduled', 'In Progress')

  and examiner_id is not null

  and student_id is not null

  and (session_type is null or session_type <> 'exam')

  and start_time > now() - interval '60 days';


