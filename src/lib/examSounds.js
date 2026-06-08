/**
 * Case-linked auscultation audio for the Physical Exam manikin zones.
 *
 * Place MP3 files under public/exam_sounds/{caseKey}/:
 *   lung.mp3    — played for all blue (lung) zone buttons
 *   cardiac.mp3 — played for all red (heart) zone buttons
 *
 * Optional per-zone overrides: public/exam_sounds/{caseKey}/{zoneId}.mp3
 * e.g. pneumonia/chest-left.mp3 for crackles on the affected side only.
 */

const CASE_KEYS = [
  'pneumonia',
  'asthma',
  'copd',
  'aortic-stenosis',
  'mitral-stenosis',
];

/** YouTube search hints — one query per case × sound type (for sourcing clips). */
export const EXAM_SOUND_SEARCH_HINTS = {
  pneumonia: {
    lung: 'pneumonia lung crackles decreased breath sounds stethoscope auscultation',
    cardiac: 'normal heart sounds S1 S2 tachycardia stethoscope',
  },
  asthma: {
    lung: 'asthma expiratory wheeze diffuse stethoscope auscultation',
    cardiac: 'normal heart sounds S1 S2 stethoscope',
  },
  copd: {
    lung: 'COPD wheeze prolonged expiration decreased breath sounds stethoscope',
    cardiac: 'distant heart sounds COPD stethoscope',
  },
  'aortic-stenosis': {
    lung: 'normal vesicular breath sounds clear lungs stethoscope',
    cardiac: 'aortic stenosis systolic murmur crescendo decrescendo stethoscope',
  },
  'mitral-stenosis': {
    lung: 'bibasilar crackles pulmonary congestion stethoscope',
    cardiac: 'mitral stenosis diastolic murmur opening snap apex stethoscope',
  },
};

/**
 * @param {string} caseKey
 * @param {{ id: string, type: 'lung' | 'cardiac' }} zone
 * @returns {string}
 */
export function getExamSoundUrl(caseKey, zone) {
  const key = CASE_KEYS.includes(caseKey) ? caseKey : 'pneumonia';
  return `/exam_sounds/${key}/${zone.id}.mp3`;
}

/**
 * Fallback URL when a per-zone file is not uploaded yet.
 * @param {string} caseKey
 * @param {{ type: 'lung' | 'cardiac' }} zone
 * @returns {string}
 */
export function getExamSoundFallbackUrl(caseKey, zone) {
  const key = CASE_KEYS.includes(caseKey) ? caseKey : 'pneumonia';
  return `/exam_sounds/${key}/${zone.type}.mp3`;
}

async function isAudioAssetUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) return false;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    // Vite SPA fallback returns 200 + text/html for missing public files
    return type.includes('audio') || type.includes('mpeg') || type.includes('mp3');
  } catch {
    return false;
  }
}

/**
 * Prefer case+type default (lung.mp3 / cardiac.mp3), then optional per-zone override.
 * @param {string} caseKey
 * @param {{ id: string, type: 'lung' | 'cardiac' }} zone
 * @returns {Promise<string|null>}
 */
export async function resolveExamSoundUrl(caseKey, zone) {
  const candidates = [
    getExamSoundFallbackUrl(caseKey, zone),
    getExamSoundUrl(caseKey, zone),
  ];
  for (const url of candidates) {
    if (await isAudioAssetUrl(url)) return url;
  }
  return null;
}
