import { supabase } from './supabase';
import { formatExamStation } from './examStationDisplay';

const CORE_FIELDS = 'id, start_time, end_time, status, score, session_type, examiner_id, station_id';

const STUDENT_EXAM_SELECT = `
  ${CORE_FIELDS},
  station:stations(name, room_number, location),
  examiner:profiles!examiner_id(full_name)
`;

const STUDENT_EXAM_SELECT_MINIMAL = CORE_FIELDS;

/** DB uses sessions.session_type (practice | exam). Some deployments also have legacy `type`. */
export function getSessionKind(row) {
  if (row?.session_type === 'exam' || row?.type === 'exam') return 'exam';
  return row?.session_type || row?.type || 'practice';
}

export function isExamSessionRow(row) {
  return getSessionKind(row) === 'exam';
}

function normalizeStatus(status) {
  return (status || '').toString().trim().toLowerCase().replace(/_/g, ' ');
}

function isUpcomingStatus(status) {
  const s = normalizeStatus(status);
  return s === 'scheduled' || s === 'in progress';
}

function timeMs(iso) {
  if (!iso) return NaN;
  return new Date(iso).getTime();
}

function hasScheduledWindowEnded(row, nowMs = Date.now()) {
  const endMs = timeMs(row?.end_time);
  if (!Number.isNaN(endMs)) return nowMs > endMs;

  const startMs = timeMs(row?.start_time);
  if (!Number.isNaN(startMs) && normalizeStatus(row?.status) === 'scheduled') {
    return nowMs > startMs;
  }

  return false;
}

export function isActiveOrUpcomingExamSession(row, nowMs = Date.now()) {
  if (!isUpcomingStatus(row?.status)) return false;
  return !hasScheduledWindowEnded(row, nowMs);
}

async function loadStudentSessions(studentId, select) {
  return supabase
    .from('sessions')
    .select(select)
    .eq('student_id', studentId)
    .order('start_time', { ascending: true });
}

async function studentHasExamAlert(studentId) {
  const { data } = await supabase
    .from('alerts')
    .select('id')
    .eq('source_id', `student:${studentId}`)
    .ilike('message', '%OSCE exam%')
    .order('created_at', { ascending: false })
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Student-safe exam row — no case title or category */
export function mapStudentExamSession(row) {
  return {
    id: row.id,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    score: row.score,
    station: row.station,
    stationLabel: formatExamStation(row.station),
    examiner: row.examiner,
  };
}

function pickExamRows(allRows) {
  const explicit = (allRows || []).filter(isExamSessionRow);
  if (explicit.length > 0) return explicit;

  const scheduled = (allRows || []).filter(
    (r) => isActiveOrUpcomingExamSession(r) && r.examiner_id
  );
  if (scheduled.length >= 2) return scheduled;

  return [];
}

function pickAlertFallbackRows(allRows) {
  return (allRows || []).filter(isActiveOrUpcomingExamSession);
}

export async function fetchStudentExamSessions(studentId) {
  if (!studentId) return [];

  const attempts = [
    STUDENT_EXAM_SELECT_MINIMAL,
    STUDENT_EXAM_SELECT,
  ];

  let data = null;
  for (const select of attempts) {
    const { data: rows, error } = await loadStudentSessions(studentId, select);
    if (!error) {
      data = rows;
      break;
    }
    console.warn('[fetchStudentExamSessions]', error.message);
  }

  if (!data?.length) {
    if (await studentHasExamAlert(studentId)) {
      console.warn(
        '[fetchStudentExamSessions] No session rows for student (check RLS: run supabase_migration_sessions_student_select.sql)'
      );
    }
    return [];
  }

  let examRows = pickExamRows(data);

  if (examRows.length === 0 && (await studentHasExamAlert(studentId))) {
    examRows = pickAlertFallbackRows(data);
  }

  return examRows.map(mapStudentExamSession);
}

/** Shown when alerts exist but session rows are invisible (usually RLS). */
export async function getStudentExamLoadIssue(studentId) {
  if (!studentId) return null;
  const { data, error } = await loadStudentSessions(studentId, STUDENT_EXAM_SELECT_MINIMAL);
  if (!error && (data?.length ?? 0) > 0) return null;
  const hasAlert = await studentHasExamAlert(studentId);
  return hasAlert ? 'sessions_not_visible' : null;
}

export function splitStudentExamSessions(sessions) {
  const nowMs = Date.now();
  const upcoming = sessions.filter((s) => isActiveOrUpcomingExamSession(s, nowMs));
  const past = sessions
    .filter((s) => {
      const st = normalizeStatus(s.status);
      return st === 'completed' || st === 'cancelled' || hasScheduledWindowEnded(s, nowMs);
    })
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  return { upcoming, past };
}
