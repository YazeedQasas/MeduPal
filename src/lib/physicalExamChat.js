/**
 * OSCE exam instructor — /patient-reply with session_mode=physical_exam.
 * Groq/Ollama for natural replies; rule-based scoring on the server (no symptom reveals).
 */

import { getPatientReplyApiUrl } from './sttFasterWhisper';

export function getPhysicalExamChatApiUrl() {
  return getPatientReplyApiUrl();
}

/**
 * @param {object} params
 * @param {string} [params.caseId]
 * @param {string} [params.caseTitle]
 * @param {string} [params.caseCategory]
 * @param {string[]} [params.symptoms]
 * @param {string} [params.chiefComplaint]
 * @param {string} [params.patientId]
 * @param {string} [params.patientName]
 * @param {string} [params.message]
 * @param {string|null} [params.currentRegion]
 * @param {object[]} [params.conversationHistory]
 */
export async function sendPhysicalExamChatMessage({
  caseId = '',
  caseTitle = '',
  caseCategory = '',
  patientName = '',
  message,
  currentRegion = null,
  conversationHistory = [],
}) {
  const base = getPhysicalExamChatApiUrl();
  if (!base) {
    throw new Error(
      'AI server URL not configured. Add VITE_PATIENT_REPLY_URL=http://localhost:8000 to .env.local'
    );
  }

  const res = await fetch(`${base}/patient-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_mode: 'physical_exam',
      student_question: message,
      physical_exam_region: currentRegion,
      case_id: caseId,
      case_title: caseTitle,
      case_category: caseCategory,
      patient_name: patientName,
      conversation_history: conversationHistory,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((d) => d?.msg || d).join(', ')
          : res.statusText || 'Request failed';
    throw new Error(detail);
  }

  return {
    reply: data.text || 'OK.',
    phase: data.phase || 'ack',
    currentRegion: data.physical_exam_region ?? currentRegion,
    replySource: data.reply_source || res.headers.get('X-Reply-Source') || 'physical_exam',
  };
}
