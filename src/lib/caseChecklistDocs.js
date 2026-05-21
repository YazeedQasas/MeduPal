const HISTORY_PDF = {
  respiratory: 'Respiratory-History-OSCE-Checklist-Geeky-Medics.pdf',
  cardiovascular: 'Cardiovascular-History-OSCE-Checklist-Geeky-Medics.pdf',
};

const CARDIO_MOCK_KEYS = new Set(['aortic-stenosis', 'mitral-stenosis']);

/** @returns {'respiratory' | 'cardiovascular'} */
export function getChecklistSystemKind(caseObj, mockKey) {
  if (mockKey && CARDIO_MOCK_KEYS.has(mockKey)) return 'cardiovascular';
  const cat = (caseObj?.category || '').toLowerCase();
  if (cat.includes('cardiac') || cat.includes('cardio')) return 'cardiovascular';
  return 'respiratory';
}

export function getHistoryChecklistPdfUrl(caseObj, mockKey) {
  const kind = getChecklistSystemKind(caseObj, mockKey);
  const file = HISTORY_PDF[kind];
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/case-docs/${encodeURIComponent(file)}`;
}

export function getHistoryChecklistLabel(caseObj, mockKey) {
  const kind = getChecklistSystemKind(caseObj, mockKey);
  return kind === 'cardiovascular' ? 'Cardiovascular history checklist' : 'Respiratory history checklist';
}
