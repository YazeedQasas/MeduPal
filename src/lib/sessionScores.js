import { supabase } from './supabase';

export const SKILL_HISTORY = 'history_taking';
export const SKILL_PHYSICAL = 'physical_examination';

const SKILL_TYPES = [SKILL_HISTORY, SKILL_PHYSICAL];

/** Map history_evaluations percent (0–100) to session_scores skill score (0–10). */
export function percentToSkillScore(percent) {
  if (percent == null || Number.isNaN(Number(percent))) return 0;
  return Math.min(10, Math.max(0, Math.round(Number(percent) / 10)));
}

/** Upsert one row in session_scores for this session + skill. */
export async function upsertSkillScore(sessionId, skillType, scoreOutOf10) {
  if (!sessionId || !skillType) return { error: new Error('Missing session or skill type') };
  const score = Math.min(10, Math.max(0, Math.round(Number(scoreOutOf10))));
  const { error } = await supabase
    .from('session_scores')
    .upsert(
      { session_id: sessionId, skill_type: skillType, score },
      { onConflict: 'session_id,skill_type' }
    );
  if (error) console.warn(`[session_scores] ${skillType}:`, error.message);
  return { error };
}

/**
 * history_evaluations.final_percent (0–100) → session_scores.history_taking,
 * then refresh sessions.score.
 */
export async function syncHistoryScoreFromEvaluation(sessionId, finalPercent) {
  await upsertSkillScore(sessionId, SKILL_HISTORY, percentToSkillScore(finalPercent));
  return recomputeSessionTotalScore(sessionId);
}

/** Physical exam score (0–10) → session_scores.physical_examination, then refresh sessions.score. */
export async function syncPhysicalScore(sessionId, scoreOutOf10) {
  await upsertSkillScore(sessionId, SKILL_PHYSICAL, scoreOutOf10);
  return recomputeSessionTotalScore(sessionId);
}

/**
 * physical evaluation final_percent (0–100) → session_scores.physical_examination,
 * then refresh sessions.score.
 */
export async function syncPhysicalScoreFromEvaluation(sessionId, finalPercent) {
  await upsertSkillScore(sessionId, SKILL_PHYSICAL, percentToSkillScore(finalPercent));
  return recomputeSessionTotalScore(sessionId);
}

/**
 * Combined sessions.score (0–100):
 * Add history_taking + physical_examination (each 0–10), scale to 0–100 → (h + p) / 20 × 100.
 * If only one skill exists, use that skill × 10.
 */
export async function recomputeSessionTotalScore(sessionId) {
  if (!sessionId) return { sessionScore: null, error: new Error('Missing session id') };

  const { data: rows, error } = await supabase
    .from('session_scores')
    .select('skill_type, score')
    .eq('session_id', sessionId)
    .in('skill_type', SKILL_TYPES);

  if (error) {
    console.warn('[session_scores] fetch:', error.message);
    return { sessionScore: null, error };
  }

  const bySkill = {};
  for (const row of rows || []) {
    if (row.skill_type != null && row.score != null) {
      bySkill[row.skill_type] = Number(row.score);
    }
  }

  const history = bySkill[SKILL_HISTORY];
  const physical = bySkill[SKILL_PHYSICAL];

  let sessionScore = 0;
  if (history != null && physical != null) {
    sessionScore = Math.min(100, Math.round(((history + physical) / 20) * 100));
  } else if (history != null) {
    sessionScore = Math.min(100, Math.round(history * 10));
  } else if (physical != null) {
    sessionScore = Math.min(100, Math.round(physical * 10));
  }

  const { error: updateErr } = await supabase
    .from('sessions')
    .update({ score: sessionScore })
    .eq('id', sessionId);

  if (updateErr) console.warn('[sessions] score update:', updateErr.message);

  return { sessionScore, error: updateErr };
}
