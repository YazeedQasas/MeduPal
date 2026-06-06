import { supabase } from './supabase';
import { syncHistoryScoreFromEvaluation, syncPhysicalScoreFromEvaluation } from './sessionScores';

export const HISTORY_EVAL_TYPE = 'history_taking';
export const PHYSICAL_EVAL_TYPE = 'physical_examination';

/** Count covered checklist items and return 0–100 percent. */
export function percentFromSections(sections) {
  if (!sections?.length) return 0;
  let covered = 0;
  let total = 0;
  for (const section of sections) {
    for (const item of section.items || []) {
      total += 1;
      if (item.covered) covered += 1;
    }
  }
  return total > 0 ? Math.round((covered / total) * 100) : 0;
}

export function countFromSections(sections) {
  const total = sections?.reduce((n, s) => n + (s.items?.length || 0), 0) ?? 0;
  const covered = sections?.reduce(
    (n, s) => n + (s.items?.filter((i) => i.covered).length || 0),
    0
  ) ?? 0;
  return { covered, total };
}

function aiPercentFromResult(result) {
  if (result?.items_covered != null && result?.total_items) {
    return Math.round((result.items_covered / result.total_items) * 100);
  }
  return percentFromSections(result?.sections);
}

/** Core columns only (works even if optional columns were not added). */
export function buildHistoryEvalRow({
  sessionId,
  isExam,
  result,
  includeOptional = true,
  evaluationType = HISTORY_EVAL_TYPE,
}) {
  const aiPercent = aiPercentFromResult(result);
  const now = new Date().toISOString();
  const counts = countFromSections(result.sections);

  const row = {
    session_id: sessionId,
    evaluation_type: evaluationType,
    items_covered: result.items_covered ?? counts.covered,
    total_items: result.total_items ?? counts.total,
    ai_percent: aiPercent,
    sections: result.sections ?? [],
    structure_followed: result.structure_followed ?? null,
    structure_notes: result.structure_notes ?? null,
    feedback: result.feedback ?? null,
    strengths: result.strengths ?? [],
    areas_for_improvement: result.areas_for_improvement ?? [],
    final_percent: aiPercent,
    review_status: isExam ? 'pending_instructor' : 'auto',
    released_to_student: !isExam,
    released_at: isExam ? null : now,
    scored_at: now,
  };

  if (includeOptional) {
    // Omit if your table lacks these — retry logic strips them on error
  }

  return row;
}

async function tryUpsertRow(row) {
  const { data, error } = await supabase
    .from('history_evaluations')
    .upsert(row, { onConflict: 'session_id,evaluation_type' })
    .select()
    .single();
  return { data, error };
}

async function tryInsertOrUpdate(row) {
  const evalType = row.evaluation_type || HISTORY_EVAL_TYPE;
  const { data: existing } = await supabase
    .from('history_evaluations')
    .select('id')
    .eq('session_id', row.session_id)
    .eq('evaluation_type', evalType)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from('history_evaluations')
      .update(row)
      .eq('id', existing.id)
      .select()
      .single();
    return { data, error };
  }

  const { data, error } = await supabase
    .from('history_evaluations')
    .insert(row)
    .select()
    .single();
  return { data, error };
}

/** Persist AI evaluation (practice: visible immediately; exam: pending instructor). */
export async function upsertEvaluation({
  sessionId,
  isExam,
  caseId,
  checklistKey,
  result,
  evaluationType = HISTORY_EVAL_TYPE,
}) {
  if (!sessionId || !result?.sections) {
    return { data: null, error: new Error('Missing session or evaluation data') };
  }

  let row = buildHistoryEvalRow({ sessionId, isExam, result, evaluationType });
  if (caseId) row = { ...row, case_id: caseId };
  if (checklistKey) row = { ...row, checklist_key: checklistKey };

  let { data, error } = await tryUpsertRow(row);

  if (error?.message?.includes('case_id') || error?.message?.includes('checklist_key')) {
    const minimal = buildHistoryEvalRow({ sessionId, isExam, result, evaluationType });
    ({ data, error } = await tryUpsertRow(minimal));
  }

  if (error) {
    ({ data, error } = await tryInsertOrUpdate(row));
  }

  if (error) {
    console.error(`[history_evaluations] ${evaluationType} save failed:`, error.message, error.details, error.hint);
    return { data: null, error };
  }

  if (evaluationType === PHYSICAL_EVAL_TYPE) {
    await syncPhysicalScoreFromEvaluation(sessionId, row.final_percent);
  } else {
    await syncHistorySessionScore(sessionId, row.final_percent);
  }
  return { data, error: null };
}

/** Persist AI history evaluation (practice: visible immediately; exam: pending instructor). */
export async function upsertHistoryEvaluation(args) {
  return upsertEvaluation({ ...args, evaluationType: HISTORY_EVAL_TYPE });
}

/** Persist AI physical examination evaluation (same table + flow as history). */
export async function upsertPhysicalEvaluation(args) {
  return upsertEvaluation({ ...args, evaluationType: PHYSICAL_EVAL_TYPE });
}

/** history_evaluations % → session_scores.history_taking + sessions.score rollup. */
export async function syncHistorySessionScore(sessionId, percent) {
  if (!sessionId || percent == null) return;
  await syncHistoryScoreFromEvaluation(sessionId, percent);
}

export async function fetchEvaluation(sessionId, evaluationType = HISTORY_EVAL_TYPE) {
  const { data, error } = await supabase
    .from('history_evaluations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('evaluation_type', evaluationType)
    .maybeSingle();
  return { data, error };
}

export async function fetchHistoryEvaluation(sessionId) {
  return fetchEvaluation(sessionId, HISTORY_EVAL_TYPE);
}

export async function fetchPhysicalEvaluation(sessionId) {
  return fetchEvaluation(sessionId, PHYSICAL_EVAL_TYPE);
}

/** Batch fetch history + physical rows for instructor sessions list */
export async function fetchEvaluationsForSessions(sessionIds) {
  if (!sessionIds?.length) return { history: {}, physical: {} };
  const { data, error } = await supabase
    .from('history_evaluations')
    .select('*')
    .in('session_id', sessionIds);
  if (error) {
    console.warn('[history_evaluations] batch fetch:', error.message);
    return { history: {}, physical: {} };
  }
  const history = {};
  const physical = {};
  (data || []).forEach((row) => {
    if (row.evaluation_type === PHYSICAL_EVAL_TYPE) physical[row.session_id] = row;
    else history[row.session_id] = row;
  });
  return { history, physical };
}

/** Batch fetch for instructor sessions list (history only — backward compatible) */
export async function fetchHistoryEvaluationsForSessions(sessionIds) {
  const { history } = await fetchEvaluationsForSessions(sessionIds);
  return history;
}

/** Instructor saves adjusted score (does not release to student). */
export async function saveInstructorEvalReview({
  sessionId,
  evaluationType = HISTORY_EVAL_TYPE,
  instructorPercent,
  instructorSections,
  instructorNotes,
  reviewerId,
}) {
  const sections = instructorSections ?? [];
  const { covered, total } = countFromSections(sections);
  const finalPercent = instructorPercent ?? percentFromSections(sections);
  const now = new Date().toISOString();

  const patch = {
    instructor_percent: instructorPercent ?? finalPercent,
    instructor_sections: sections.length ? sections : null,
    instructor_notes: instructorNotes ?? null,
    items_covered: covered,
    total_items: total,
    final_percent: finalPercent,
    reviewed_by: reviewerId,
    reviewed_at: now,
    review_status: 'saved',
  };

  let { data, error } = await supabase
    .from('history_evaluations')
    .update(patch)
    .eq('session_id', sessionId)
    .eq('evaluation_type', evaluationType)
    .select()
    .single();

  if (error?.message?.includes('instructor_')) {
    const minimal = {
      items_covered: covered,
      total_items: total,
      final_percent: finalPercent,
      reviewed_at: now,
      review_status: 'saved',
    };
    ({ data, error } = await supabase
      .from('history_evaluations')
      .update(minimal)
      .eq('session_id', sessionId)
      .eq('evaluation_type', evaluationType)
      .select()
      .single());
  }

  if (error) return { data: null, error };

  if (evaluationType === PHYSICAL_EVAL_TYPE) {
    await syncPhysicalScoreFromEvaluation(sessionId, finalPercent);
  } else {
    await syncHistorySessionScore(sessionId, finalPercent);
  }
  return { data, error: null };
}

export async function saveInstructorHistoryReview(args) {
  return saveInstructorEvalReview({ ...args, evaluationType: HISTORY_EVAL_TYPE });
}

export async function saveInstructorPhysicalReview(args) {
  return saveInstructorEvalReview({ ...args, evaluationType: PHYSICAL_EVAL_TYPE });
}

/** Instructor releases final score to the student. */
export async function releaseEvaluationToStudent(sessionId, evaluationType = HISTORY_EVAL_TYPE) {
  const now = new Date().toISOString();

  const { data: evalRow, error: fetchErr } = await fetchEvaluation(sessionId, evaluationType);
  if (fetchErr || !evalRow) {
    const label = evaluationType === PHYSICAL_EVAL_TYPE ? 'physical examination' : 'history-taking';
    return { data: null, error: fetchErr || new Error(`No ${label} evaluation found for this session.`) };
  }

  const { data, error } = await supabase
    .from('history_evaluations')
    .update({
      released_to_student: true,
      review_status: 'released',
      released_at: now,
    })
    .eq('session_id', sessionId)
    .eq('evaluation_type', evaluationType)
    .select()
    .single();

  if (error) return { data: null, error };

  const finalPercent = Math.round(evalRow.final_percent ?? evalRow.ai_percent ?? 0);
  if (evaluationType === PHYSICAL_EVAL_TYPE) {
    await syncPhysicalScoreFromEvaluation(sessionId, finalPercent);
  } else {
    await syncHistoryScoreFromEvaluation(sessionId, finalPercent);
  }

  return { data, error: null };
}

/** Instructor releases final history score to the student. */
export async function releaseHistoryEvaluationToStudent(sessionId) {
  return releaseEvaluationToStudent(sessionId, HISTORY_EVAL_TYPE);
}

/** Instructor releases final physical score to the student. */
export async function releasePhysicalEvaluationToStudent(sessionId) {
  return releaseEvaluationToStudent(sessionId, PHYSICAL_EVAL_TYPE);
}

function normalizeInsightText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function topCountedEntries(counts, limit = 5) {
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Cohort-level strengths, gaps, and missed checklist items for instructor dashboards. */
export function aggregateHistoryEvalInsights(rows, { limit = 5 } = {}) {
  const strengthCounts = {};
  const gapCounts = {};
  const missedCounts = {};
  let evalCount = 0;
  let pctSum = 0;

  for (const row of rows || []) {
    if (!row) continue;
    evalCount += 1;
    pctSum += row.final_percent ?? row.ai_percent ?? 0;

    for (const s of row.strengths || []) {
      const key = normalizeInsightText(s);
      if (key) strengthCounts[key] = (strengthCounts[key] || 0) + 1;
    }
    for (const a of row.areas_for_improvement || []) {
      const key = normalizeInsightText(a);
      if (key) gapCounts[key] = (gapCounts[key] || 0) + 1;
    }

    const sections = row.instructor_sections?.length ? row.instructor_sections : row.sections;
    for (const section of sections || []) {
      for (const item of section.items || []) {
        if (!item.covered) {
          const key = normalizeInsightText(item.text || item.label);
          if (key) missedCounts[key] = (missedCounts[key] || 0) + 1;
        }
      }
    }
  }

  return {
    evalCount,
    avgChecklistPct: evalCount ? Math.round(pctSum / evalCount) : null,
    topStrengths: topCountedEntries(strengthCounts, limit),
    topGaps: topCountedEntries(gapCounts, limit),
    topMissedItems: topCountedEntries(missedCounts, limit),
  };
}

export function pickEval(embed, evaluationType = HISTORY_EVAL_TYPE) {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return embed.find((r) => r.evaluation_type === evaluationType) || null;
  }
  if (embed.evaluation_type && embed.evaluation_type !== evaluationType) return null;
  return embed;
}

export function pickHistoryEval(embed) {
  return pickEval(embed, HISTORY_EVAL_TYPE);
}

export function pickPhysicalEval(embed) {
  return pickEval(embed, PHYSICAL_EVAL_TYPE);
}

export function studentCanSeeEvalScore(sessionKind, evalRow) {
  if (sessionKind === 'practice') return true;
  if (sessionKind === 'exam') return Boolean(evalRow?.released_to_student);
  return false;
}

export function studentCanSeeHistoryScore(sessionKind, historyEval) {
  return studentCanSeeEvalScore(sessionKind, historyEval);
}

export function studentCanSeePhysicalScore(sessionKind, physicalEval) {
  return studentCanSeeEvalScore(sessionKind, physicalEval);
}

export function displayEvalPercent(evalRow) {
  if (!evalRow) return null;
  return evalRow.final_percent ?? evalRow.ai_percent ?? null;
}

export function displayHistoryPercent(historyEval) {
  return displayEvalPercent(historyEval);
}

export function displayPhysicalPercent(physicalEval) {
  return displayEvalPercent(physicalEval);
}

export function evalStatusLabel(evalRow) {
  if (!evalRow) return null;
  if (evalRow.released_to_student) return 'Released';
  if (evalRow.review_status === 'saved') return 'Saved — not sent';
  if (evalRow.review_status === 'pending_instructor') return 'Awaiting review';
  if (evalRow.review_status === 'auto') return 'Auto-scored';
  return evalRow.review_status;
}

export function historyEvalStatusLabel(historyEval) {
  return evalStatusLabel(historyEval);
}

export function physicalEvalStatusLabel(physicalEval) {
  return evalStatusLabel(physicalEval);
}

export const EVAL_TYPE_LABELS = {
  [HISTORY_EVAL_TYPE]: 'History-taking',
  [PHYSICAL_EVAL_TYPE]: 'Physical examination',
};
