import { supabase } from './supabase';
import { syncHistoryScoreFromEvaluation } from './sessionScores';

export const HISTORY_EVAL_TYPE = 'history_taking';

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
export function buildHistoryEvalRow({ sessionId, isExam, result, includeOptional = true }) {
  const aiPercent = aiPercentFromResult(result);
  const now = new Date().toISOString();
  const counts = countFromSections(result.sections);

  const row = {
    session_id: sessionId,
    evaluation_type: HISTORY_EVAL_TYPE,
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
  const { data: existing } = await supabase
    .from('history_evaluations')
    .select('id')
    .eq('session_id', row.session_id)
    .eq('evaluation_type', HISTORY_EVAL_TYPE)
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

/** Persist AI history evaluation (practice: visible immediately; exam: pending instructor). */
export async function upsertHistoryEvaluation({ sessionId, isExam, caseId, checklistKey, result }) {
  if (!sessionId || !result?.sections) {
    return { data: null, error: new Error('Missing session or evaluation data') };
  }

  let row = buildHistoryEvalRow({ sessionId, isExam, result });
  if (caseId) row = { ...row, case_id: caseId };
  if (checklistKey) row = { ...row, checklist_key: checklistKey };

  let { data, error } = await tryUpsertRow(row);

  if (error?.message?.includes('case_id') || error?.message?.includes('checklist_key')) {
    const minimal = buildHistoryEvalRow({ sessionId, isExam, result });
    ({ data, error } = await tryUpsertRow(minimal));
  }

  if (error) {
    ({ data, error } = await tryInsertOrUpdate(row));
  }

  if (error) {
    console.error('[history_evaluations] save failed:', error.message, error.details, error.hint);
    return { data: null, error };
  }

  await syncHistorySessionScore(sessionId, row.final_percent);
  return { data, error: null };
}

/** history_evaluations % → session_scores.history_taking + sessions.score rollup. */
export async function syncHistorySessionScore(sessionId, percent) {
  if (!sessionId || percent == null) return;
  await syncHistoryScoreFromEvaluation(sessionId, percent);
}

export async function fetchHistoryEvaluation(sessionId) {
  const { data, error } = await supabase
    .from('history_evaluations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('evaluation_type', HISTORY_EVAL_TYPE)
    .maybeSingle();
  return { data, error };
}

/** Batch fetch for instructor sessions list */
export async function fetchHistoryEvaluationsForSessions(sessionIds) {
  if (!sessionIds?.length) return {};
  const { data, error } = await supabase
    .from('history_evaluations')
    .select('*')
    .in('session_id', sessionIds)
    .eq('evaluation_type', HISTORY_EVAL_TYPE);
  if (error) {
    console.warn('[history_evaluations] batch fetch:', error.message);
    return {};
  }
  const map = {};
  (data || []).forEach((row) => {
    map[row.session_id] = row;
  });
  return map;
}

/** Instructor saves adjusted score (does not release to student). */
export async function saveInstructorHistoryReview({
  sessionId,
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
    .eq('evaluation_type', HISTORY_EVAL_TYPE)
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
      .eq('evaluation_type', HISTORY_EVAL_TYPE)
      .select()
      .single());
  }

  if (error) return { data: null, error };

  await syncHistorySessionScore(sessionId, finalPercent);
  return { data, error: null };
}

/** Instructor releases final history score to the student. */
export async function releaseHistoryEvaluationToStudent(sessionId) {
  const now = new Date().toISOString();

  const { data: evalRow, error: fetchErr } = await fetchHistoryEvaluation(sessionId);
  if (fetchErr || !evalRow) {
    return { data: null, error: fetchErr || new Error('No history evaluation found for this session.') };
  }

  const { data, error } = await supabase
    .from('history_evaluations')
    .update({
      released_to_student: true,
      review_status: 'released',
      released_at: now,
    })
    .eq('session_id', sessionId)
    .eq('evaluation_type', HISTORY_EVAL_TYPE)
    .select()
    .single();

  if (error) return { data: null, error };

  const finalPercent = Math.round(evalRow.final_percent ?? evalRow.ai_percent ?? 0);
  await syncHistoryScoreFromEvaluation(sessionId, finalPercent);

  return { data, error: null };
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

export function pickHistoryEval(embed) {
  if (!embed) return null;
  if (Array.isArray(embed)) {
    return embed.find((r) => r.evaluation_type === HISTORY_EVAL_TYPE) || embed[0] || null;
  }
  return embed;
}

export function studentCanSeeHistoryScore(sessionKind, historyEval) {
  if (sessionKind === 'practice') return true;
  if (sessionKind === 'exam') return Boolean(historyEval?.released_to_student);
  return false;
}

export function displayHistoryPercent(historyEval) {
  if (!historyEval) return null;
  return historyEval.final_percent ?? historyEval.ai_percent ?? null;
}

export function historyEvalStatusLabel(historyEval) {
  if (!historyEval) return null;
  if (historyEval.released_to_student) return 'Released';
  if (historyEval.review_status === 'saved') return 'Saved — not sent';
  if (historyEval.review_status === 'pending_instructor') return 'Awaiting review';
  if (historyEval.review_status === 'auto') return 'Auto-scored';
  return historyEval.review_status;
}
