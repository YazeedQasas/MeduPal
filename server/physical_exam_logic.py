"""
OSCE exam instructor — hybrid engine.

1. Rule-based classifier scores each student turn (ack / correct / incorrect).
2. Groq or Ollama generates a natural instructor reply guided by that outcome.
3. A safety filter blocks replies that leak findings; canned fallbacks used if needed.

Findings are never revealed to the student.
"""

from __future__ import annotations

import re
from typing import Literal

# Align with ZONE_FINDINGS + extended OSCE regions in StudentPracticeFlow.jsx
PHYSICAL_EXAM_FINDINGS: dict[str, dict[str, dict]] = {
    "pneumonia": {
        "head": {
            "expects_normal": True,
            "match_keywords": ["normal", "nothing", "no abnormality", "unremarkable", "no findings", "clear"],
        },
        "neck": {
            "expects_normal": True,
            "match_keywords": ["normal", "nothing", "no abnormality", "unremarkable", "no lymphadenopathy", "no swelling"],
        },
        "lung": {
            "expects_normal": False,
            "match_keywords": [
                "crackle", "crackles", "crepit", "crepitation", "decreased breath", "reduced breath",
                "dullness", "dull", "bronchial", "coarse", "decreased air entry", "reduced air entry",
                "consolidation", "pleural rub", "stony dull", "bronchial breathing",
            ],
        },
        "cardiac": {
            "expects_normal": False,
            "match_keywords": [
                "tachycardia", "tachycardic", "fast heart", "elevated heart rate", "rapid heart",
                "normal heart sound", "normal heart sounds", "s1 s2", "no murmur",
            ],
        },
        "abdomen": {
            "expects_normal": True,
            "match_keywords": ["normal", "soft", "non-tender", "nothing", "no abnormality", "unremarkable"],
        },
    },
    "asthma": {
        "head": {"expects_normal": True, "match_keywords": ["normal", "nothing", "no abnormality", "unremarkable"]},
        "neck": {"expects_normal": True, "match_keywords": ["normal", "nothing", "no abnormality", "unremarkable"]},
        "lung": {
            "expects_normal": False,
            "match_keywords": ["wheeze", "wheezing", "expiratory", "diffuse", "polyphonic", "prolonged expiration"],
        },
        "cardiac": {
            "expects_normal": True,
            "match_keywords": ["normal", "normal heart", "no murmur", "nothing", "unremarkable"],
        },
        "abdomen": {"expects_normal": True, "match_keywords": ["normal", "soft", "non-tender", "nothing"]},
    },
    "copd": {
        "head": {"expects_normal": True, "match_keywords": ["normal", "nothing", "no abnormality"]},
        "neck": {"expects_normal": True, "match_keywords": ["normal", "nothing", "no abnormality"]},
        "lung": {
            "expects_normal": False,
            "match_keywords": [
                "wheeze", "wheezing", "prolonged expiration", "decreased breath",
                "hyperinflation", "barrel chest", "reduced breath", "distant breath",
            ],
        },
        "cardiac": {
            "expects_normal": False,
            "match_keywords": ["distant heart", "distant sound", "quiet heart", "muffled"],
        },
        "abdomen": {"expects_normal": True, "match_keywords": ["normal", "soft", "non-tender", "nothing"]},
    },
    "aortic-stenosis": {
        "head": {"expects_normal": True, "match_keywords": ["normal", "nothing", "no abnormality"]},
        "neck": {
            "expects_normal": False,
            "match_keywords": ["carotid", "slow rising", "pulsus parvus", "delayed pulse", "weak pulse"],
        },
        "lung": {
            "expects_normal": True,
            "match_keywords": ["clear", "normal breath", "vesicular", "nothing", "no abnormality"],
        },
        "cardiac": {
            "expects_normal": False,
            "match_keywords": [
                "murmur", "systolic", "ejection", "crescendo", "decrescendo",
                "harsh", "radiating", "carotid radiation", "aortic",
            ],
        },
        "abdomen": {"expects_normal": True, "match_keywords": ["normal", "soft", "non-tender", "nothing"]},
    },
    "mitral-stenosis": {
        "head": {"expects_normal": True, "match_keywords": ["normal", "nothing", "no abnormality"]},
        "neck": {"expects_normal": True, "match_keywords": ["normal", "nothing", "no abnormality", "no jvp"]},
        "lung": {
            "expects_normal": False,
            "match_keywords": ["crackle", "crackles", "bibasilar", "basal crackle", "crepit"],
        },
        "cardiac": {
            "expects_normal": False,
            "match_keywords": [
                "diastolic", "rumble", "opening snap", "mitral", "apex",
                "loud s1", "murmur", "low pitched",
            ],
        },
        "abdomen": {"expects_normal": True, "match_keywords": ["normal", "soft", "non-tender", "nothing"]},
    },
}

REGION_ALIASES: dict[str, list[str]] = {
    "head": ["head", "skull", "scalp", "face", "cranial"],
    "neck": ["neck", "throat", "cervical", "lymph node", "lymph nodes", "jvp"],
    "lung": [
        "lung", "lungs", "chest", "thorax", "breath", "respiratory", "pulmonary",
        "auscultat", "percuss", "back", "posterior chest", "anterior chest",
        "chest left", "chest right", "upper back", "lower back",
    ],
    "cardiac": [
        "heart", "cardiac", "cardiovascular", "aortic", "mitral", "apex",
        "precordium", "sternal",
    ],
    "abdomen": ["abdomen", "abdominal", "belly", "stomach", "gut"],
}

ACTION_PATTERNS = [
    r"\b(i want to|let me|i will|i'd like to|going to|can i)\b.*\b(check|examine|inspect|palpate|auscultate|percuss|look|feel|listen)\b",
    r"\b(check|examine|inspect|palpate|auscultate|percuss|listen to|look at|feel)\b",
    r"\b(perform|do|start)\b.*\b(exam|examination|assessment)\b",
]

GREETING_PATTERNS = [
    r"^(hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you)\b",
    r"^(ok|okay|yes|no)\.?$",
]

# Diagnosis / opinion questions — neutral OK only, never evaluate as findings
QUESTION_PATTERNS = [
    r"\?",
    r"\b(is it|could it be|might it be|do you think|would you say|am i right|what is wrong|what's wrong)\b",
    r"\b(pneumonia|asthma|copd|infection|sepsis|heart failure|stenosis|embolism)\b",
    r"\b(diagnosis|condition|disease|what do i have)\b",
]

# Student asks instructor to reveal findings/symptoms — blocked with a clear refusal.
REVEAL_REQUEST_PATTERNS = [
    r"\b(what do you hear|what do you see|what do you find|what should i find|what are the findings)\b",
    r"\b(tell me the finding|tell me what you hear|describe the finding|describe what you hear)\b",
    r"\b(what are the symptoms|what symptom|any symptoms|reveal|give me a hint|give me the answer)\b",
    r"\b(what is on the|what's on the|what would you expect|expected finding)\b",
    r"\b(what'?s wrong with (the )?patient|what is wrong with (the )?patient)\b",
    r"\b(does (the )?patient have|what does (the )?patient feel|how does (the )?patient feel)\b",
    r"\b(tell me about (the )?patient'?s condition|patient'?s condition|presenting complaint)\b",
    r"\b(what should i hear|what should i see|what am i looking for)\b",
]

REVEAL_BLOCKED_REPLIES = [
    "You're not supposed to ask that - examine the patient and report your own findings.",
    "I can't tell you that. Perform the examination yourself.",
    "That's not allowed in this OSCE - you need to find the answer through your examination.",
]

CLINICAL_TERMS = [
    "crackle", "crackles", "wheeze", "wheezing", "murmur", "dull", "dullness", "tender",
    "swelling", "tachycardia", "tachycardic", "normal", "nothing", "clear", "unremarkable",
    "crepit", "bronchial", "vesicular", "systolic", "diastolic", "carotid", "rumble",
    "expiratory", "consolidation", "hyperinflation", "bibasilar", "no murmur",
    "no abnormality", "no findings", "decreased breath", "reduced breath", "soft",
    "non-tender", "pleural", "ejection", "opening snap",
]

VAGUE_ONLY_TERMS = [
    "something", "some thing", "anything", "issue", "problem", "wrong", "bad",
    "not sure", "unsure", "don't know", "dont know", "maybe", "possibly",
]

NEGATION_ONLY = [
    "nothing", "normal", "no abnormality", "no findings", "unremarkable", "clear",
    "all clear", "within normal", "wnl", "no murmur",
]

REPLY_ACK = "OK."
REPLY_CORRECT = "OK, move to the next step."
REPLY_INCORRECT = "Ahh… you should check again."

FALLBACK_ACK = [
    "OK.",
    "Go ahead.",
    "Proceed.",
]
FALLBACK_CORRECT = [
    REPLY_CORRECT,
    "OK, continue.",
]
FALLBACK_INCORRECT = [
    REPLY_INCORRECT,
    "You should check again.",
]

# Instructor must not mix roles in one reply (no hint + feedback together).
HINT_PHRASE_PATTERNS = [
    r"\btry\b",
    r"\bremember\b",
    r"\bmake sure\b",
    r"\balso\b",
    r"\bnext you\b",
    r"\byou should also\b",
    r"\bdon'?t forget\b",
    r"\bconsider\b",
    r"\blook for\b",
    r"\blisten\b",
    r"\blisten for\b",
    r"\bauscultat",
    r"\bpalpate\b",
    r"\bpercuss\b",
    r"\bsystematic",
    r"\bre-?examine\b",
    r"\bthat area\b",
    r"\bthe (chest|heart|neck|abdomen|lung|apex|base)\b",
]
FEEDBACK_IN_ACK_PATTERNS = [
    r"\bcorrect\b",
    r"\bincorrect\b",
    r"\bwrong\b",
    r"\bnot quite\b",
    r"\bgood finding\b",
    r"\bwell done\b",
    r"\bnice work\b",
    r"\bmove on\b",
    r"\bcheck again\b",
]

STUDENT_INTRO_PATTERNS = [
    r"\b(?:hi,?\s*)?(?:my name is|this is)\s+([a-z][a-z'-]{1,24})\b",
    r"\b(?:hi,?\s*)?i am\.?\s+([a-z][a-z'-]{1,24})\b",
    r"\b(?:hi,?\s*)?(?:i am|i'm)\s+(?!going|gonna|about|ready|just|trying|planning|looking|checking|examining|starting|doing|wondering|thinking|here|a|the|not|very|really|also|sure|sorry)([a-z][a-z'-]{1,24})\b",
]
NOT_STUDENT_NAME_WORDS = {
    "the", "dr", "doctor", "a", "here", "student", "medical", "hi", "hello",
    "going", "gonna", "about", "ready", "just", "trying", "planning", "looking",
    "checking", "examining", "starting", "doing", "wondering", "thinking",
    "not", "very", "really", "also", "sure", "sorry", "now", "back",
}
PATIENT_IDENTITY_PATTERNS = [
    r"patient(?:'s)? name",
    r"confirm(?:ing)? (?:the )?patient(?:'s)? identity",
    r"patient identity",
    r"the patient is",
    r"patient is called",
]
STATED_PATIENT_NAME_PATTERNS = [
    r"patient(?:'s)? name (?:is|'s)\s+([a-z][a-z'-]{1,24})",
    r"the patient is\s+([a-z][a-z'-]{1,24})",
    r"patient is called\s+([a-z][a-z'-]{1,24})",
]
PRAISE_IN_INCORRECT_PATTERNS = [
    r"\bgood\b",
    r"\bgreat\b",
    r"\bnice\b",
    r"\bcorrect\b",
    r"\breasonable\b",
]

REGION_LABELS = {
    "head": "head and face",
    "neck": "neck",
    "lung": "chest / respiratory",
    "cardiac": "cardiovascular / precordium",
    "abdomen": "abdomen",
}

DIAGNOSIS_BLOCKLIST = [
    "pneumonia", "asthma", "copd", "stenosis", "embolism", "failure",
    "consolidation", "wheeze", "wheezing", "crackle", "crackles",
    "murmur", "rumble", "opening snap", "tachycardia",
]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def detect_region(text: str) -> str | None:
    """Infer body region from student message."""
    t = _normalize(text)
    if not t:
        return None
    best_region = None
    best_score = 0
    for region, aliases in REGION_ALIASES.items():
        score = sum(1 for alias in aliases if alias in t)
        if score > best_score:
            best_score = score
            best_region = region
    return best_region


def _is_greeting(text: str) -> bool:
    t = _normalize(text)
    return any(re.search(pat, t) for pat in GREETING_PATTERNS)


def _is_reveal_or_symptom_question(text: str, patient_name: str = "") -> bool:
    """Student is asking for symptoms, findings, diagnosis, or hints — not allowed."""
    if _is_patient_identity_attempt(text):
        return False
    t = _normalize(text)
    if not t:
        return False
    if any(re.search(pat, t) for pat in REVEAL_REQUEST_PATTERNS):
        return True
    if any(re.search(pat, t) for pat in QUESTION_PATTERNS):
        return True
    if re.search(r"\b(symptom|signs of|pathology|what'?s wrong|what is wrong)\b", t):
        return True
    return "?" in t and re.search(
        r"\b(patient|diagnosis|symptom|finding|hear|see|feel|wrong|condition|disease)\b", t
    )


def _is_question_or_diagnosis(text: str) -> bool:
    """Questions about diagnosis or reveal requests — do not score as a finding."""
    return _is_reveal_or_symptom_question(text)


def reveal_blocked_reply() -> tuple[str, str]:
    import random
    return random.choice(REVEAL_BLOCKED_REPLIES), "reveal_blocked"


def _has_clinical_substance(text: str) -> bool:
    t = _normalize(text)
    if _mentions_negation_only(text):
        return True
    return any(term in t for term in CLINICAL_TERMS)


def _is_vague_only(text: str) -> bool:
    """e.g. 'I found something' with no real finding terms."""
    t = _normalize(text)
    if _has_clinical_substance(text):
        return False
    return any(v in t for v in VAGUE_ONLY_TERMS) or re.search(
        r"\b(i found|i see|i hear|there is)\b", t
    )


def _is_exam_action(text: str) -> bool:
    t = _normalize(text)
    return any(re.search(pat, t) for pat in ACTION_PATTERNS)


def _is_unclear_finding_attempt(text: str) -> bool:
    """Garbled or vague utterance — not a scorable finding report."""
    t = _normalize(text)
    if not t or _has_clinical_substance(text) or _is_exam_action(text):
        return False
    if any(v in t for v in VAGUE_ONLY_TERMS):
        return True
    if len(t.split()) <= 5 and re.search(r"\b(patient|maybe|think|something|unsure|not sure)\b", t):
        return True
    return False


def classify_message(text: str, current_region: str | None) -> Literal["action", "finding"]:
    t = _normalize(text)
    if not t:
        return "action"

    if _is_greeting(t) or _is_question_or_diagnosis(t):
        return "action"

    if _is_exam_action(t) or _is_unclear_finding_attempt(t):
        return "action"

    # Finding: must have clinical substance (not vague-only)
    if _has_clinical_substance(t):
        return "finding"

    # Vague "I found something" only counts as finding if we already have an exam region
    if current_region and _is_vague_only(t):
        return "finding"

    return "action"


def _mentions_negation_only(text: str) -> bool:
    t = _normalize(text)
    if not any(neg in t for neg in NEGATION_ONLY):
        return False
    positive_clinical = [
        "crackle", "wheeze", "murmur", "dull", "tender", "swelling",
        "tachycardia", "carotid", "rumble", "snap", "wheezing", "consolidation",
    ]
    return not any(kw in t for kw in positive_clinical)


def evaluate_finding(
    case_key: str,
    region: str | None,
    student_text: str,
) -> bool:
    if not region:
        return False

    if _is_vague_only(student_text):
        return False

    case_data = PHYSICAL_EXAM_FINDINGS.get(case_key) or PHYSICAL_EXAM_FINDINGS["pneumonia"]
    region_data = case_data.get(region)
    if not region_data:
        if _mentions_negation_only(student_text) or "normal" in _normalize(student_text):
            return True
        return False

    t = _normalize(student_text)
    keywords = region_data.get("match_keywords") or []
    expects_normal = bool(region_data.get("expects_normal"))

    if expects_normal:
        return _mentions_negation_only(student_text) or any(kw in t for kw in keywords)

    if _mentions_negation_only(student_text):
        return False
    return any(kw in t for kw in keywords)


def _extract_student_name(text: str) -> str | None:
    if _is_exam_action(text):
        return None
    t = _normalize(text)
    for pat in STUDENT_INTRO_PATTERNS:
        m = re.search(pat, t)
        if m:
            name = m.group(1).strip().title()
            if name.lower() not in NOT_STUDENT_NAME_WORDS and len(name) >= 2:
                return name
    return None


def _extract_stated_patient_name(text: str) -> str | None:
    t = _normalize(text)
    for pat in STATED_PATIENT_NAME_PATTERNS:
        m = re.search(pat, t)
        if m:
            name = m.group(1).strip().title()
            if len(name) >= 2:
                return name
    return None


def _patient_name_matches(stated: str, actual: str) -> bool:
    s = _normalize(stated)
    a = _normalize(actual)
    if not s or not a:
        return False
    if s == a or s in a or a in s:
        return True
    return s.split()[0] == a.split()[0]


def _is_patient_identity_attempt(text: str) -> bool:
    t = _normalize(text)
    if any(re.search(pat, t) for pat in PATIENT_IDENTITY_PATTERNS):
        return True
    return _extract_stated_patient_name(text) is not None


def _is_patient_identity_statement(text: str, patient_name: str) -> bool:
    """Student correctly confirmed the patient's identity (name must match)."""
    if not patient_name:
        return False
    t = _normalize(text)
    pn = _normalize(patient_name)
    stated = _extract_stated_patient_name(text)
    if stated:
        return _patient_name_matches(stated, patient_name)
    if pn in t and re.search(r"\b(name|identity|confirm|patient|called)\b", t):
        return True
    if pn.split()[0] in t and re.search(r"\b(name|patient)\b", t):
        return True
    return False


def _exam_action_reply(message: str) -> tuple[str, str] | None:
    if not _is_exam_action(message):
        return None
    region = detect_region(message)
    if region:
        label = REGION_LABELS.get(region, region)
        return (f"OK. Proceed with the {label} examination.", "exam_action")
    return ("OK. Proceed with the examination.", "exam_action")


def _unclear_finding_reply(region: str | None = None) -> tuple[str, str]:
    if region:
        label = REGION_LABELS.get(region, region)
        return (
            f"Please state clearly what you found on the {label} examination.",
            "unclear_finding",
        )
    return (
        "Please describe clearly what you found on your examination.",
        "unclear_finding",
    )


def contextual_ack_reply(
    message: str,
    patient_name: str = "",
    region: str | None = None,
) -> tuple[str, str] | None:
    """Natural OSCE examiner acknowledgments for intros and identity checks."""
    exam = _exam_action_reply(message)
    if exam:
        return exam
    if _is_unclear_finding_attempt(message):
        return _unclear_finding_reply(region)
    student = _extract_student_name(message)
    if student:
        return (f"Thank you, {student}. You may continue.", "student_intro")
    if patient_name and _is_patient_identity_statement(message, patient_name):
        return (
            f"That's correct - the patient is {patient_name}. Please continue.",
            "patient_identity",
        )
    if patient_name and _is_patient_identity_attempt(message):
        if _extract_stated_patient_name(message):
            return (
                "That's not correct. Please check the patient's identity again.",
                "patient_identity_wrong",
            )
        return (
            "Please state the patient's full name to confirm their identity.",
            "patient_identity_prompt",
        )
    if _is_greeting(message):
        return ("Hello. Please begin when you are ready.", "greeting")
    if re.search(r"\b(consent|permission|may i examine|like to examine)\b", _normalize(message)):
        return ("Of course. Please proceed.", "consent")
    return None


def _fallback_reply(phase: str) -> str:
    import random
    if phase == "evaluate_correct":
        return random.choice(FALLBACK_CORRECT)
    if phase == "evaluate_incorrect":
        return random.choice(FALLBACK_INCORRECT)
    return random.choice(FALLBACK_ACK)


def get_reveal_blocklist(case_key: str) -> set[str]:
    """Terms the instructor must not say unless the student said them first."""
    terms = set(DIAGNOSIS_BLOCKLIST)
    case_data = PHYSICAL_EXAM_FINDINGS.get(case_key) or PHYSICAL_EXAM_FINDINGS["pneumonia"]
    for data in case_data.values():
        if not data.get("expects_normal"):
            for kw in data.get("match_keywords") or []:
                if len(kw) >= 4:
                    terms.add(kw)
    return terms


def build_instructor_system_prompt(
    case_key: str,
    case_title: str,
    case_category: str,
    patient_name: str = "",
) -> str:
    title = (case_title or case_key.replace("-", " ").title()).strip()
    category = (case_category or "clinical").strip()
    patient_line = (
        f"The patient for this station is {patient_name}. "
        "You may confirm their name when the student states it correctly. "
        if patient_name
        else ""
    )
    return (
        "You are an OSCE clinical skills examiner supervising a physical examination. "
        f"Station: {title} ({category}). {patient_line}\n\n"
        "CRITICAL — one purpose per reply only. Never combine acknowledgment, feedback, and hints.\n\n"
        "NEVER reveal examination findings or diagnoses. You are NOT the patient.\n\n"
        "Each turn you receive a THIS TURN block with Outcome and Instruction — follow it exactly.\n\n"
        "Outcomes:\n"
        "- ACK / REFUSE: brief natural examiner response per the instruction.\n"
        "- CORRECT: tell them to move on only — never reveal findings.\n"
        "- INCORRECT: tell them to check again only — never reveal findings.\n\n"
        "Exactly ONE short sentence. Sound like a real OSCE examiner, not a chatbot."
    )


def build_evaluation_instruction(
    phase: str,
    region: str | None,
    student_message: str,
    *,
    patient_name: str = "",
    ack_kind: str | None = None,
    student_name: str | None = None,
) -> str:
    region_line = ""
    if region:
        label = REGION_LABELS.get(region, region)
        region_line = f"\nExamination region in focus: {label}."

    if phase == "evaluate_correct":
        outcome = "CORRECT"
        style = 'The student reported an appropriate finding. Say only that they may move on (e.g. "OK, move to the next step.").'
    elif phase == "evaluate_incorrect":
        outcome = "INCORRECT"
        style = 'The student\'s reported finding does not match what they should find. Say only that they should check again (e.g. "You should check again."). Do not reveal the answer.'
    elif ack_kind == "reveal_blocked":
        outcome = "REFUSE"
        style = (
            "The student asked for symptoms, diagnosis, or hidden findings. "
            'Refuse briefly and tell them to examine the patient themselves (e.g. "You need to find that through your own examination."). '
            "Do NOT give any clinical findings or hints."
        )
    elif ack_kind == "student_intro" and student_name:
        outcome = "ACK"
        style = f'The student introduced themselves as {student_name}. Thank them by name and let them continue the examination.'
    elif ack_kind == "patient_identity" and patient_name:
        outcome = "ACK"
        style = (
            f"The student correctly confirmed the patient's identity. "
            f"Confirm the patient is {patient_name} and let them continue. "
            "You may say they are correct."
        )
    elif ack_kind == "patient_identity_wrong":
        outcome = "ACK"
        style = (
            "The student stated the wrong patient name. "
            "Tell them it is not correct and they should check the patient's identity again. "
            f"Do NOT state the correct name ({patient_name or 'unknown'})."
        )
    elif ack_kind == "patient_identity_prompt":
        outcome = "ACK"
        style = "The student tried to confirm identity without stating a full name. Ask them to state the patient's full name."
    elif ack_kind == "exam_action":
        outcome = "ACK"
        if region:
            label = REGION_LABELS.get(region, region)
            style = f"The student is starting or continuing a {label} examination step. Acknowledge and tell them to proceed with that examination."
        else:
            style = "The student is starting a physical examination step. Acknowledge and tell them to proceed."
    elif ack_kind == "unclear_finding":
        outcome = "ACK"
        if region:
            label = REGION_LABELS.get(region, region)
            style = f"The student's message was vague or unclear. Ask them to state clearly what they found on the {label} examination."
        else:
            style = "The student's message was vague or unclear. Ask them to state clearly what they found on their examination."
    elif ack_kind == "greeting":
        outcome = "ACK"
        style = "Reply with a brief professional greeting and invite them to begin the examination when ready."
    elif ack_kind == "consent":
        outcome = "ACK"
        style = "The student asked for consent to examine. Grant permission briefly and tell them to proceed."
    else:
        outcome = "ACK"
        style = "Brief neutral acknowledgment of their examination action (e.g. OK / Go ahead). No hints or findings."

    return (
        f"\n\n=== THIS TURN ===\n"
        f"Outcome: {outcome}\n"
        f'Student said: "{student_message.strip()}"'
        f"{region_line}\n"
        f"Instruction: {style}\n"
        "Reply in exactly ONE short professional sentence. Do not add a second purpose."
    )


def _first_sentence(text: str) -> str:
    """Keep the first sentence only — drop anything after . ! ? """
    cleaned = text.strip()
    parts = re.split(r"(?<=[.!?])\s+", cleaned, maxsplit=1)
    return (parts[0].strip() if parts else cleaned).rstrip(".,!?")


def _matches_any(patterns: list[str], text: str) -> bool:
    return any(re.search(pat, text) for pat in patterns)


_ACK_KINDS_ALLOW_EXAM_WORDS = frozenset({
    "exam_action", "consent", "unclear_finding",
})


def _violates_single_purpose(phase: str, text: str, ack_kind: str | None = None) -> bool:
    t = _normalize(text)
    if ack_kind not in _ACK_KINDS_ALLOW_EXAM_WORDS and _matches_any(HINT_PHRASE_PATTERNS, t):
        return True
    if phase == "ack" and _matches_any(FEEDBACK_IN_ACK_PATTERNS, t):
        if ack_kind in ("patient_identity", "patient_identity_wrong"):
            pass
        elif not re.search(r"\bgood (morning|afternoon|evening)\b", t):
            return True
    if phase == "evaluate_incorrect":
        if _matches_any(PRAISE_IN_INCORRECT_PATTERNS, t):
            return True
        if re.search(r"\bnot quite\b", t):
            return True
        if not re.search(r"\b(check again|should check)\b", t):
            return True
    if phase == "evaluate_correct":
        if re.search(r"\b(wrong|incorrect|check again|re-?examine)\b", t):
            return True
        if not re.search(r"\b(move|continue|next step|carry on|proceed|may continue)\b", t):
            return True
    if re.search(r"\b(but|however|also|and remember|make sure)\b", t):
        return True
    return False


def sanitize_instructor_reply(
    text: str,
    case_key: str,
    student_message: str,
    phase: str = "ack",
    ack_kind: str | None = None,
) -> str | None:
    """Return cleaned single-purpose reply, or None if unsafe or mixed-purpose."""
    raw = re.sub(r"\s+", " ", (text or "").strip())
    if not raw or len(raw) > 200:
        return None
    if _violates_single_purpose(phase, raw, ack_kind=ack_kind):
        return None
    cleaned = _first_sentence(raw)
    if not cleaned or len(cleaned) > 120:
        return None
    t = _normalize(cleaned)
    student = _normalize(student_message)
    for term in get_reveal_blocklist(case_key):
        if term in t and term not in student:
            return None
    return cleaned


def handle_physical_exam_message(
    *,
    case_key: str,
    message: str,
    current_region: str | None = None,
    patient_name: str = "",
) -> dict:
    text = (message or "").strip()
    if not text:
        return {
            "reply": _fallback_reply("ack"),
            "phase": "ack",
            "current_region": current_region,
        }

    if _is_reveal_or_symptom_question(text, patient_name):
        reply, ack_kind = reveal_blocked_reply()
        return {
            "reply": reply,
            "phase": "ack",
            "current_region": current_region,
            "ack_kind": ack_kind,
        }

    intent = classify_message(text, current_region)

    if intent == "action":
        region = detect_region(text) or current_region
        contextual = contextual_ack_reply(text, patient_name, region=region)
        if contextual:
            reply, ack_kind = contextual
            return {
                "reply": reply,
                "phase": "ack",
                "current_region": region,
                "ack_kind": ack_kind,
                "student_name": _extract_student_name(text),
            }
        return {
            "reply": _fallback_reply("ack"),
            "phase": "ack",
            "current_region": region,
        }

    region = current_region or detect_region(text)
    if not region:
        contextual = contextual_ack_reply(text, patient_name, region=current_region)
        if contextual:
            reply, ack_kind = contextual
            return {
                "reply": reply,
                "phase": "ack",
                "current_region": None,
                "ack_kind": ack_kind,
                "student_name": _extract_student_name(text),
            }
        return {
            "reply": _fallback_reply("ack"),
            "phase": "ack",
            "current_region": None,
        }

    is_correct = evaluate_finding(case_key, region, text)
    phase = "evaluate_correct" if is_correct else "evaluate_incorrect"
    return {
        "reply": _fallback_reply(phase),
        "phase": phase,
        "current_region": region,
    }
