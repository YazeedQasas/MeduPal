import { supabase } from './supabase';

const DEFAULT_STATION_DURATION_MIN = 10;

function parseDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function minutesToMs(min) {
  return Math.max(1, Number(min) || 0) * 60 * 1000;
}

function buildStationWindows(stations, startAt) {
  let cursor = startAt.getTime();
  return stations.map((station) => {
    const duration = Math.max(1, Number(station.duration) || DEFAULT_STATION_DURATION_MIN);
    const start = new Date(cursor);
    const end = new Date(cursor + minutesToMs(duration));
    cursor = end.getTime();
    return {
      caseId: station.caseId,
      duration,
      examinerId: station.examinerId || null,
      start,
      end,
    };
  });
}

function hasOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

async function fetchStudentEligibility(studentIds) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, can_exam, has_hardware')
    .in('id', studentIds)
    .eq('role', 'student');
  if (error) throw error;
  return data || [];
}

async function fetchExamSessionsInRange(studentIds, rangeStartIso, rangeEndIso) {
  const fallbackStart = new Date(new Date(rangeStartIso).getTime() - minutesToMs(DEFAULT_STATION_DURATION_MIN)).toISOString();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, student_id, start_time, end_time, status, session_type, type')
    .in('student_id', studentIds)
    .neq('status', 'Cancelled')
    .gte('start_time', fallbackStart)
    .lt('start_time', rangeEndIso);
  if (error) throw error;
  return (data || []).filter((row) => {
    const kind = row.session_type || row.type;
    return kind === 'exam';
  });
}

function normalizeSessionEnd(row) {
  if (row.end_time) {
    const end = parseDate(row.end_time);
    if (end) return end;
  }
  const start = parseDate(row.start_time);
  if (!start) return null;
  return new Date(start.getTime() + minutesToMs(DEFAULT_STATION_DURATION_MIN));
}

export async function checkExamAssignmentConflicts({ students, dateTime, stations }) {
  const startAt = parseDate(dateTime);
  if (!startAt || !Array.isArray(stations) || stations.length === 0 || !Array.isArray(students) || students.length === 0) {
    return { conflictIds: new Set(), overlaps: [] };
  }

  const windows = buildStationWindows(stations, startAt);
  const rangeStart = windows[0].start.toISOString();
  const rangeEnd = windows[windows.length - 1].end.toISOString();
  const sessions = await fetchExamSessionsInRange(students, rangeStart, rangeEnd);

  const overlaps = [];
  sessions.forEach((session) => {
    const existingStart = parseDate(session.start_time);
    const existingEnd = normalizeSessionEnd(session);
    if (!existingStart || !existingEnd) return;
    windows.forEach((window) => {
      if (hasOverlap(window.start, window.end, existingStart, existingEnd)) {
        overlaps.push({
          studentId: session.student_id,
          existingSessionId: session.id,
          existingStart,
          existingEnd,
          newStart: window.start,
          newEnd: window.end,
        });
      }
    });
  });

  return {
    conflictIds: new Set(overlaps.map((o) => o.studentId)),
    overlaps,
  };
}

export async function assignExam({ students, dateTime, stations, onProgress }) {
  const notify = (message) => {
    if (typeof onProgress === 'function') onProgress(message);
  };

  if (!Array.isArray(students) || students.length === 0) {
    return { ok: false, error: 'Select at least one student.' };
  }
  if (!Array.isArray(stations) || stations.length === 0) {
    return { ok: false, error: 'At least one station is required.' };
  }
  if (stations.some((s) => !s.caseId || Number(s.duration) <= 0)) {
    return { ok: false, error: 'Each station must include a case and duration greater than 0.' };
  }

  const startAt = parseDate(dateTime);
  if (!startAt) return { ok: false, error: 'Please choose a valid schedule date/time.' };
  if (startAt <= new Date()) return { ok: false, error: 'Cannot assign exams in the past.' };

  const studentIds = [...new Set(students)];
  notify('Checking student eligibility...');
  const profiles = await fetchStudentEligibility(studentIds);

  const eligibleIds = new Set(profiles.map((p) => p.id));
  const missingIds = studentIds.filter((id) => !eligibleIds.has(id));
  if (missingIds.length > 0) {
    return { ok: false, error: 'One or more selected students are not valid student accounts.' };
  }

  const examBlocked = profiles.filter((p) => !p.can_exam);
  if (examBlocked.length > 0) {
    const blockedLabel = examBlocked[0].full_name || examBlocked[0].email || 'Selected student';
    return { ok: false, error: `This student is not allowed to take exams: ${blockedLabel}` };
  }

  const hardwareWarnings = profiles
    .filter((p) => !p.has_hardware)
    .map((p) => p.full_name || p.email || p.id);

  const windows = buildStationWindows(stations, startAt);
  const rows = [];
  studentIds.forEach((studentId) => {
    windows.forEach((window) => {
      rows.push({
        student_id: studentId,
        case_id: window.caseId,
        examiner_id: window.examinerId || null,
        start_time: window.start.toISOString(),
        end_time: window.end.toISOString(),
        status: 'Scheduled',
        session_type: 'exam',
      });
    });
  });

  if (rows.length === 0) {
    return { ok: false, error: 'No sessions generated from your selection.' };
  }

  notify('Creating exam sessions...');
  const { error: insertError } = await supabase.from('sessions').insert(rows);
  if (insertError) return { ok: false, error: insertError.message || 'Failed to create exam sessions.' };

  const label = startAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const notificationRows = studentIds.map((studentId) => ({
    type: 'warning',
    message: `You have a new OSCE exam scheduled for ${label}.`,
    recipient_id: studentId,
    source_id: `student:${studentId}`,
    is_acknowledged: false,
  }));
  notify('Sending student notifications...');
  const { error: alertError } = await supabase.from('alerts').insert(notificationRows);

  return {
    ok: true,
    insertedCount: rows.length,
    warnings: hardwareWarnings.length
      ? [`Student may not be fully ready for exam (no hardware assigned): ${hardwareWarnings.join(', ')}`]
      : [],
    alertError: alertError?.message || '',
  };
}

