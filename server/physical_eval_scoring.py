"""
Strict rule-based physical examination checklist scoring.

Only marks an item covered when the student explicitly states that step
(or clearly pairs a technique with a manikin zone). Does not infer whole
sections from a single vague action.
"""

from __future__ import annotations

import re
from typing import Any

ANTERIOR_LUNG_ZONES = {"chest left", "chest right"}
POSTERIOR_LUNG_ZONES = {
    "upper back left",
    "upper back right",
    "lower back left",
    "lower back right",
}
CARDIAC_ZONES = {"heart (aortic)", "heart (mitral)"}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _join_turns(turns: list[str]) -> str:
    return _normalize(" ".join(t for t in turns if t))


def _manikin_zones(exam_log: list[dict] | None) -> set[str]:
    zones: set[str] = set()
    for entry in exam_log or []:
        label = _normalize(entry.get("zone") or "")
        if label:
            zones.add(label)
    return zones


def _has(text: str, *phrases: str) -> bool:
    return any(p in text for p in phrases)


def _has_re(text: str, pattern: str) -> bool:
    return bool(re.search(pattern, text))


def _inspect(text: str) -> bool:
    return _has(text, "inspect", "look at", "observe", "observation", "examine visually", "check for scar")


def _palpate(text: str) -> bool:
    return _has(text, "palpat", "feel for", "fremitus", "expansion", "chest expansion")


def _percuss(text: str) -> bool:
    return _has(text, "percuss", "percussion", "tap on")


def _auscultate(text: str) -> bool:
    return _has(text, "auscultat", "listen to the", "listen for", "listen with", "stethoscope")


def _anterior_ctx(text: str) -> bool:
    return _has(text, "anterior", "front of chest", "front of the chest", "chest front")


def _posterior_ctx(text: str) -> bool:
    return _has(text, "posterior", "back of chest", "back of the chest", "upper back", "lower back", "sit forward")


def _prep_covered(text: str, item: int) -> bool:
    rules = {
        1: ("wash hand", "hand gel", "hand hygiene", "ppe", "sanitize", "sanitise"),
        2: (
            "introduce", "my name is", "i am dr", "i'm dr", "name and role",
            "i am the medical", "i am a medical", "i'm a medical",
        ),
        3: (
            "confirm identity", "confirm the patient", "patient identity",
            "date of birth", "who are you", "patient name is", "patient's name",
            "patients name", "the patient is", "patient is called",
        ),
        4: ("consent", "permission", "may i examine", "like to examine", "examine you", "is that okay"),
        5: ("position", "sit up", "45 degree", "sit at 45", "sitting at", "sit forward"),
        6: ("expose", "exposure", "bare chest", "shirt off", "maintain dignity", "dignity"),
    }
    if _has(text, *rules.get(item, ())):
        return True
    if item == 2 and _has_re(text, r"\b(?:i am|i'm)\b"):
        return True
    if item == 3 and _has_re(text, r"patient'?s name|patient name is|confirm(?:ing)? .{0,20}identity"):
        return True
    return False


def _apply_preparation_items(
    covered: set[int],
    text: str,
    turns: list[str],
    patient_name: str = "",
) -> None:
    """Mark prep checklist items from exam chat (aligned with instructor logic)."""
    from physical_exam_logic import _extract_student_name, _is_patient_identity_statement

    for n in range(1, 7):
        if n == 3:
            continue
        if _prep_covered(text, n):
            covered.add(n)
        elif any(_prep_covered(_normalize(t), n) for t in turns):
            covered.add(n)

    if _extract_student_name(text) or any(_extract_student_name(t) for t in turns):
        covered.add(2)

    if patient_name and (
        _is_patient_identity_statement(text, patient_name)
        or any(_is_patient_identity_statement(t, patient_name) for t in turns)
    ):
        covered.add(3)


def _score_respiratory(
    text: str,
    zones: set[str],
    turns: list[str] | None = None,
    patient_name: str = "",
) -> set[int]:
    covered: set[int] = set()
    turn_list = turns or []

    _apply_preparation_items(covered, text, turn_list, patient_name)

    if _has(text, "end of the bed", "end of bed") and _inspect(text):
        covered.add(7)
    if _has(text, "oxygen", "sputum pot", "sputum"):
        covered.add(8)
    if _has(text, "respiratory rate", "breathing pattern", "respiratory pattern", "count the breath", "count breath"):
        covered.add(9)

    if _has(text, "clubbing", "peripheral cyanosis", "tar stain", "asterixis") or (
        _inspect(text) and _has(text, "hands", "hand ")
    ):
        covered.add(10)
    if _has(text, "pulse rate", "pulse rhythm", "radial pulse", "check the pulse", "feel the pulse"):
        covered.add(11)
    if _has(text, "capillary refill"):
        covered.add(12)

    if _inspect(text) and _has(text, "eye", "conjunctiv", "anaemia", "cyanosis"):
        covered.add(13)
    if _inspect(text) and _has(text, "mouth", "tongue"):
        covered.add(14)
    if _has(text, "jvp", "jugular venous"):
        covered.add(15)
    if _has(text, "lymph node", "cervical node", "supraclavicular"):
        covered.add(16)

    anterior_zones = zones & ANTERIOR_LUNG_ZONES
    posterior_zones = zones & POSTERIOR_LUNG_ZONES

    if (_inspect(text) and (_anterior_ctx(text) or _has(text, "anterior chest"))) or (
        _inspect(text) and anterior_zones and not _posterior_ctx(text)
    ):
        covered.add(17)

    if (_palpate(text) and (_anterior_ctx(text) or _has(text, "anterior chest", "chest expansion", "vocal fremitus"))) or (
        _palpate(text) and anterior_zones
    ):
        covered.add(18)

    if _percuss(text) and (_anterior_ctx(text) or _has(text, "anterior chest")) or (
        _percuss(text) and anterior_zones
    ):
        covered.add(19)

    if (_auscultate(text) and (_anterior_ctx(text) or _has(text, "anterior chest"))) or (
        _auscultate(text) and anterior_zones
    ):
        covered.add(20)

    if _has(text, "sit forward") and _inspect(text) and _posterior_ctx(text):
        covered.add(21)
    if _palpate(text) and _posterior_ctx(text):
        covered.add(22)
    if _percuss(text) and _posterior_ctx(text):
        covered.add(23)
    if (_auscultate(text) and _posterior_ctx(text)) or (_auscultate(text) and posterior_zones):
        covered.add(24)

    if _has(text, "vocal resonance", "whispered pectoriloquy", "pectoriloquy"):
        covered.add(25)
    if _has(text, "peak flow", "spirometry"):
        covered.add(26)

    if _has(text, "thank the patient", "thank you", "restore clothing", "cover the patient", "help you dress"):
        covered.add(27)
    if _has(text, "summarise", "summarize", "in summary", "summary of", "overall my findings", "to conclude"):
        covered.add(28)

    return covered


def _score_cardiovascular(
    text: str,
    zones: set[str],
    turns: list[str] | None = None,
    patient_name: str = "",
) -> set[int]:
    covered: set[int] = set()
    cardiac_zones = zones & CARDIAC_ZONES
    turn_list = turns or []

    _apply_preparation_items(covered, text, turn_list, patient_name)

    if _has(text, "end of the bed", "end of bed") and _inspect(text):
        covered.add(7)
    if _has(text, "heart failure", "orthopnoea", "orthopnea", "oedema", "edema", "cyanosis"):
        covered.add(8)
    if _has(text, "medication", "oxygen", "monitoring", "equipment at the bed"):
        covered.add(9)

    if _has(text, "clubbing", "splinter haemorrhage", "splinter hemorrhage", "osler", "janeway") or (
        _inspect(text) and _has(text, "hands", "hand ")
    ):
        covered.add(10)
    if _has(text, "capillary refill", "peripheral temperature", "warmth of hands"):
        covered.add(11)
    if _has(text, "radial pulse", "pulse rate", "pulse rhythm", "pulse character", "feel the pulse"):
        covered.add(12)
    if _has(text, "blood pressure", "bp in both arms"):
        covered.add(13)

    if _inspect(text) and _has(text, "eye", "xanthelasma", "corneal arcus", "jaundice", "anaemia"):
        covered.add(14)
    if _inspect(text) and _has(text, "mouth", "dental", "high-arched palate", "palate"):
        covered.add(15)
    if _has(text, "jvp", "jugular venous"):
        covered.add(16)
    if _has(text, "carotid") and (_palpate(text) or _auscultate(text) or _has(text, "bruit")):
        covered.add(17)

    if _inspect(text) and _has(text, "precordium", "apex beat", "cardiac scar"):
        covered.add(18)
    if _palpate(text) and _has(text, "apex beat", "apex"):
        covered.add(19)
    if _palpate(text) and _has(text, "heave", "thrill"):
        covered.add(20)
    if (_auscultate(text) and _has(text, "cardiac area", "precordium", "heart sound", "aortic", "pulmonary", "tricuspid", "mitral")) or (
        _auscultate(text) and cardiac_zones
    ):
        covered.add(21)
    if _auscultate(text) and _has(text, "bell", "low-pitched", "low pitched", "apex"):
        covered.add(22)
    if _auscultate(text) and _has(text, "radiation", "radiates", "neck", "axilla", "carotid"):
        covered.add(23)

    if _auscultate(text) and _has(text, "lung base", "bibasal", "bibasilar", "bases"):
        covered.add(24)
    if _inspect(text) and _has(text, "leg", "ankle", "peripheral oedema", "peripheral edema"):
        covered.add(25)
    if _palpate(text) and _has(text, "abdomen", "hepatomegaly", "liver"):
        covered.add(26)

    if _has(text, "sacral oedema", "sacral edema", "lie flat"):
        covered.add(27)
    if _has(text, "pressure area", "sacral", "ankle pressure"):
        covered.add(28)

    if _has(text, "thank the patient", "thank you", "restore clothing", "cover the patient"):
        covered.add(29)
    if _has(text, "summarise", "summarize", "in summary", "summary of", "overall my findings"):
        covered.add(30)

    return covered


def _structure_followed(covered: set[int], case_type: str) -> tuple[bool, str]:
    prep = covered & {1, 2, 3, 4, 5, 6}
    if case_type == "cardiovascular":
        exam_core = covered & {18, 19, 20, 21}
        closing = covered & {29, 30}
        if len(prep) >= 3 and exam_core and closing:
            return True, "Preparation, precordial examination, and closing were attempted in a logical order."
        if len(prep) < 2:
            return False, "Preparation steps were largely missing before examining."
        if not exam_core:
            return False, "Core precordial examination steps were not clearly demonstrated."
        return False, "Examination order was incomplete — work through preparation, precordium, then close."
    exam_core = covered & {17, 18, 19, 20, 21, 22, 23, 24}
    closing = covered & {27, 28}
    if len(prep) >= 3 and len(exam_core) >= 2 and closing:
        return True, "Preparation, chest examination, and closing were attempted in a logical order."
    if len(prep) < 2:
        return False, "Preparation steps were largely missing before examining."
    if len(exam_core) < 2:
        return False, "Few chest examination techniques were clearly demonstrated."
    return False, "Examination order was incomplete — work through preparation, chest, then close."


def _feedback_from_coverage(covered: set[int], checklist: dict[str, Any]) -> tuple[str, list[str], list[str]]:
    total = checklist.get("total_items") or 0
    pct = round((len(covered) / total) * 100) if total else 0
    missed_labels: list[str] = []
    hit_sections: list[str] = []
    for section in checklist.get("sections") or []:
        items = section.get("items") or []
        section_hit = sum(1 for i in items if i["num"] in covered)
        if section_hit == len(items) and items:
            hit_sections.append(section["label"])
        for item in items:
            if item["num"] not in covered:
                missed_labels.append(item["text"])
    strengths = []
    if hit_sections:
        strengths.append(f"Completed all steps in: {', '.join(hit_sections[:3])}.")
    if len(covered) >= total * 0.6:
        strengths.append("Good overall examination coverage.")
    gaps = missed_labels[:5]
    if not gaps and total:
        gaps = ["Continue practising systematic OSCE technique."]
    feedback = (
        f"You covered {len(covered)} of {total} checklist items ({pct}%). "
        + ("Strong systematic approach. " if pct >= 70 else "Several OSCE steps were not clearly demonstrated. ")
        + ("Focus next on: " + "; ".join(gaps[:3]) + "." if gaps else "")
    )
    return feedback, strengths, gaps


def score_physical_examination(
    student_turns: list[str],
    exam_log: list[dict] | None,
    case_type: str,
    checklist: dict[str, Any],
    patient_name: str = "",
) -> dict[str, Any]:
    text = _join_turns(student_turns)
    zones = _manikin_zones(exam_log)
    pname = (patient_name or "").strip()

    if case_type == "cardiovascular":
        covered = _score_cardiovascular(text, zones, student_turns, pname)
    else:
        covered = _score_respiratory(text, zones, student_turns, pname)

    structure_followed, structure_notes = _structure_followed(covered, case_type)
    feedback, strengths, gaps = _feedback_from_coverage(covered, checklist)

    normalised_sections = []
    for section in checklist.get("sections") or []:
        items_out = [
            {
                "num": item["num"],
                "text": item["text"],
                "covered": item["num"] in covered,
                "notes": "",
            }
            for item in section.get("items") or []
        ]
        normalised_sections.append(
            {"id": section["id"], "label": section["label"], "items": items_out}
        )

    total_items = checklist.get("total_items") or sum(
        len(s.get("items") or []) for s in checklist.get("sections") or []
    )

    return {
        "sections": normalised_sections,
        "items_covered": len(covered),
        "total_items": total_items,
        "structure_followed": structure_followed,
        "structure_notes": structure_notes,
        "feedback": feedback,
        "strengths": strengths,
        "areas_for_improvement": gaps,
        "covered_items": sorted(covered),
    }
