import { supabase } from './supabase';

const EXAM_STATUSES_JOINABLE = new Set(['In Progress']);

function sessionEndMs(session) {
  if (!session?.end_time) return NaN;
  return new Date(session.end_time).getTime();
}

/** True when the scheduled window has ended (end_time is in the past). */
export function isSessionPastEndTime(session) {
  const endMs = sessionEndMs(session);
  if (Number.isNaN(endMs)) return false;
  return Date.now() > endMs;
}

/**
 * Mark In Progress sessions as Completed once end_time has passed.
 * Returns the number of rows updated.
 */
export async function autoCompleteExpiredSessions() {
  const nowIso = new Date().toISOString();
  const { data: overdue, error: fetchErr } = await supabase
    .from('sessions')
    .select('id, end_time')
    .eq('status', 'In Progress')
    .not('end_time', 'is', null)
    .lt('end_time', nowIso);

  if (fetchErr || !overdue?.length) return 0;

  const ids = overdue.map((s) => s.id);
  const { error: updateErr } = await supabase
    .from('sessions')
    .update({ status: 'Completed' })
    .in('id', ids);

  if (updateErr) {
    console.error('[autoCompleteExpiredSessions]', updateErr.message);
    return 0;
  }
  return ids.length;
}

export function getSessionKind(row) {
  if (row?.session_type === 'exam' || row?.type === 'exam') return 'exam';
  return row?.session_type || row?.type || 'practice';
}

export function isExamSession(row) {
  return getSessionKind(row) === 'exam';
}

/** JOIN is only allowed when an exam is actively in progress and within the scheduled window. */
export function canJoinExamSession(session) {
  if (!session) return false;
  if (!isExamSession(session)) return false;
  if (!EXAM_STATUSES_JOINABLE.has(session.status)) return false;
  if (isSessionPastEndTime(session)) return false;
  return true;
}

/**
 * Instructor may start a scheduled exam at or after start_time and before end_time.
 */
export function canInstructorStartExam(session) {
  if (!session || !isExamSession(session)) return false;
  if (session.status !== 'Scheduled') return false;

  const startMs = session.start_time ? new Date(session.start_time).getTime() : NaN;
  if (Number.isNaN(startMs)) return false;

  const now = Date.now();
  if (now < startMs) return false;

  if (session.end_time) {
    const endMs = new Date(session.end_time).getTime();
    if (!Number.isNaN(endMs) && now > endMs) return false;
  }

  return true;
}

export function instructorStartExamError(session) {
  if (!session || !isExamSession(session)) return 'Not an exam session.';
  if (session.status !== 'Scheduled') return `Cannot start exam with status "${session.status}".`;

  const startMs = session.start_time ? new Date(session.start_time).getTime() : NaN;
  const now = Date.now();

  if (!Number.isNaN(startMs) && now < startMs) {
    const at = new Date(session.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    return `This exam is scheduled for ${at}. Start will be available at that time.`;
  }

  if (session.end_time) {
    const endMs = new Date(session.end_time).getTime();
    if (!Number.isNaN(endMs) && now > endMs) {
      return 'The scheduled exam window has ended.';
    }
  }

  return 'Cannot start this exam right now.';
}

export function sessionToPracticeLaunch(session, caseTitle, extras = {}) {
  return {
    sessionId: session.id,
    sessionType: 'exam',
    caseId: session.case_id,
    caseTitle: caseTitle || session.case?.title || null,
    studentId: session.student_id || extras.studentId || null,
    studentName: extras.studentName || session.student?.full_name || null,
  };
}

/**
 * Load exam session for instructor JOIN (In Progress only).
 */
export async function joinSession(sessionId) {
  if (!sessionId) {
    return { ok: false, error: 'Missing session id.' };
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('sessions')
    .select('id, status, session_type, case_id, student_id, examiner_id, start_time, end_time, case:cases(id, title, category), student:profiles!student_id(full_name)')
    .eq('id', sessionId)
    .maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!existing) return { ok: false, error: 'Session not found.' };
  if (!isExamSession(existing)) return { ok: false, error: 'Only exam sessions can be joined.' };

  if (isSessionPastEndTime(existing)) {
    await autoCompleteExpiredSessions();
    return { ok: false, error: 'This exam window has ended. The session is marked Completed.' };
  }

  if (!canJoinExamSession(existing)) {
    return {
      ok: false,
      error: existing.status === 'Scheduled'
        ? 'Start the exam first (set status to In Progress), then use JOIN.'
        : existing.status === 'Completed'
          ? 'This exam has already ended.'
          : 'Join is only available while the exam is In Progress.',
    };
  }

  return { ok: true, session: existing };
}

/** Instructor action: Scheduled → In Progress (enables JOIN). Only when start_time has arrived. */
export async function startExamSession(sessionId) {
  if (!sessionId) return { ok: false, error: 'Missing session id.' };

  const { data: existing, error: fetchErr } = await supabase
    .from('sessions')
    .select('id, status, session_type, start_time, end_time')
    .eq('id', sessionId)
    .maybeSingle();

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!existing) return { ok: false, error: 'Session not found.' };
  if (!isExamSession(existing)) return { ok: false, error: 'Only exam sessions can be started.' };
  if (existing.status === 'In Progress') return { ok: true, session: existing };
  if (existing.status !== 'Scheduled') {
    return { ok: false, error: `Cannot start exam with status "${existing.status}".` };
  }

  if (!canInstructorStartExam(existing)) {
    return { ok: false, error: instructorStartExamError(existing) };
  }

  const { data: updated, error: updateErr } = await supabase
    .from('sessions')
    .update({ status: 'In Progress' })
    .eq('id', sessionId)
    .select('id, status, session_type, case_id, student_id, examiner_id, start_time, end_time, case:cases(id, title, category), student:profiles!student_id(full_name)')
    .maybeSingle();

  if (updateErr) return { ok: false, error: updateErr.message };
  return { ok: true, session: updated };
}
