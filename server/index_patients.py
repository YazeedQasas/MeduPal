"""
Medupal — Patient Document Indexer
====================================
Chunks each patient's medical data by case, embeds with nomic-embed-text (via Ollama),
and upserts into Supabase patient_documents table.

patient_id format: "{patient_id}__{case_key}"  e.g. "sarah-mitchell__asthma"

Usage:
    python index_patients.py

Requires env vars (or a .env file in this directory):
    SUPABASE_URL         — https://your-project.supabase.co
    SUPABASE_SERVICE_KEY — service role key (NOT the anon key)
    OLLAMA_BASE_URL      — default http://localhost:11434
    EMBED_MODEL          — default nomic-embed-text
"""
import asyncio
import os
import sys

import httpx

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_path):
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
OLLAMA_BASE  = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
EMBED_MODEL  = os.environ.get("EMBED_MODEL", "nomic-embed-text")

# ---------------------------------------------------------------------------
# Helper: build a chunk dict
# ---------------------------------------------------------------------------
def chunk(patient: str, case: str, section: str, text: str) -> dict:
    return {
        "patient_id": f"{patient}__{case}",
        "metadata": {"section": section, "patient": patient, "case": case},
        "text": text.strip(),
    }


# ---------------------------------------------------------------------------
# PATIENT DOCUMENTS  (16 chunks × 13 combinations = 208 chunks)
# ---------------------------------------------------------------------------
PATIENT_DOCUMENTS: list[dict] = [

    # ════════════════════════════════════════════════════════════════════════
    # SARAH MITCHELL × ASTHMA
    # ════════════════════════════════════════════════════════════════════════
    chunk("sarah-mitchell", "asthma", "identity_demographics",
        "Sarah Mitchell is a 28-year-old female nurse who works rotating 12-hour shifts on a medical ward. "
        "She is anxious and tends to speak quickly. She downplays the severity of her symptoms because she "
        "does not want to seem like a hypochondriac — she is a nurse and knows what serious looks like. "
        "She frequently asks the student questions back: 'Is that serious?', 'Should I be worried?'. "
        "She only volunteers additional detail when directly asked."
    ),
    chunk("sarah-mitchell", "asthma", "chief_complaint",
        "Sarah's main complaint is worsening breathlessness and a tight feeling in her chest that started "
        "two days ago. She woke up last night short of breath and had to use her inhaler twice. She has a "
        "wheeze when she breathes out. She says 'it feels a bit worse than my usual episodes.'"
    ),
    chunk("sarah-mitchell", "asthma", "hpc_narrative",
        "Sarah noticed her breathing becoming harder two days ago after a shift in a newly cleaned ward — "
        "the cleaning products had a strong chemical smell. By yesterday evening she was wheezing and felt "
        "chest tightness. She woke at 3am unable to breathe comfortably and used her Salbutamol inhaler, "
        "which helped 'a bit but not completely.' She tried to push through her next shift but walking briskly "
        "on the ward made it worse. She asked a colleague to cover and came to clinic today. Her last similar "
        "episode was four months ago and settled on its own. She has not had a preventer inhaler for over a year."
    ),
    chunk("sarah-mitchell", "asthma", "symptom_breakdown_socrates",
        "Breathlessness — Site: diffuse across the chest. Onset: gradual over two days, worse since this morning. "
        "Character: tight, like a band across the chest; she also hears a wheeze on breathing out. "
        "Radiatin: none. Associations: audible wheeze, dry irritating cough especially at night, chest tightness. "
        "Time course: continuous over two days with episodic worsening; worst at night and early morning. "
        "Exacerbating: cold air, strong chemical smells, walking quickly. "
        "Relieving: Salbutamol inhaler gives partial relief within 10–15 minutes; sitting upright helps. "
        "Severity: 6/10 — she can still talk in full sentences but it is an effort."
    ),
    chunk("sarah-mitchell", "asthma", "associated_symptoms",
        "Sarah has a dry irritating cough that is worst at night and woke her at 3am. She has a bilateral "
        "expiratory wheeze she can hear herself. She has chest tightness across the front of her chest. "
        "She has mild fatigue from two nights of disrupted sleep. She has no sputum production."
    ),
    chunk("sarah-mitchell", "asthma", "pertinent_negatives",
        "Sarah denies any fever or chills. She has no productive cough and no sputum. She has no pleuritic "
        "chest pain. She has no haemoptysis. She has no ankle swelling. She has no palpitations. She has not "
        "started any new medications. She has not been exposed to new pets or foods. She denies any recent "
        "foreign travel. She has no TB contacts."
    ),
    chunk("sarah-mitchell", "asthma", "past_medical_history",
        "Sarah has had mild asthma since early childhood, diagnosed at age 6. She was hospitalised once at "
        "age 14 following a severe asthma attack triggered by a chest infection — she spent two days on the "
        "ward and received nebulisers and a short course of oral prednisolone. She has had approximately "
        "3–4 episodes per year since then, each typically mild and settling with Salbutamol. She has no "
        "history of eczema or allergic rhinitis. She has no other chronic medical conditions."
    ),
    chunk("sarah-mitchell", "asthma", "past_surgical_history",
        "Sarah has had no surgical procedures. She has had no hospital admissions since her asthma episode "
        "at age 14. She has never been intubated or ventilated."
    ),
    chunk("sarah-mitchell", "asthma", "medications_and_adherence",
        "Sarah takes Salbutamol 100mcg inhaler (blue reliever) as needed — she has been using it approximately "
        "4 times per day over the past two days, which is above her usual once-weekly use. She does not currently "
        "take a preventer inhaler; she was prescribed one previously but stopped when she felt well. She takes "
        "occasional Paracetamol for headaches. She takes no other regular medications."
    ),
    chunk("sarah-mitchell", "asthma", "allergies",
        "Sarah is allergic to Penicillin. When given Penicillin at age 10 for a throat infection, she developed "
        "a widespread red itchy rash within a few hours of the first dose. It resolved with antihistamines. "
        "She has no other known drug or food allergies. She carries no EpiPen."
    ),
    chunk("sarah-mitchell", "asthma", "family_history",
        "Sarah's mother has Type 2 diabetes mellitus, diagnosed in her mid-fifties. Her father is alive and well "
        "with no significant conditions. She has one younger brother with mild hayfever. There is no family "
        "history of cardiac disease, asthma, or atopic eczema in first-degree relatives."
    ),
    chunk("sarah-mitchell", "asthma", "social_history",
        "Sarah is a non-smoker and has never smoked. She drinks one to two glasses of wine on weekends only. "
        "She works rotating 12-hour shifts including nights on a busy medical ward. She lives alone in a "
        "ground-floor flat that she has recently noticed is slightly damp — she suspects mould. She does light "
        "exercise when her schedule allows but has not exercised this week due to her symptoms."
    ),
    chunk("sarah-mitchell", "asthma", "risk_factors",
        "Sarah's asthma triggers include: strong chemical smells (cleaning products, perfumes), cold air, "
        "vigorous exercise, and viral respiratory infections. She is likely currently being triggered by both "
        "occupational cleaning product exposure and mould in her flat. Her lapsed preventer inhaler leaves her "
        "airways chronically inflamed and vulnerable. Rotating night shifts cause sleep deprivation, impairing "
        "immune function. NSAIDs should be used cautiously in asthma — Sarah does not take them regularly."
    ),
    chunk("sarah-mitchell", "asthma", "ice",
        "Ideas: Sarah thinks her asthma is flaring because of the strong cleaning products used on her ward "
        "and possibly the damp in her flat. "
        "Concerns: She is worried because this episode feels worse than usual and she knows — as a nurse — "
        "what dropping oxygen levels mean. She is anxious about needing hospital admission like she did at 14. "
        "Expectations: She hopes to receive a nebuliser, be assessed properly, and be prescribed a preventer "
        "inhaler. She wants to be told it is safe to go home."
    ),
    chunk("sarah-mitchell", "asthma", "functional_impact",
        "Sarah has been unable to complete her nursing shifts for two days. She is sleeping poorly due to "
        "nocturnal coughing and breathlessness. She cannot walk briskly on the ward without symptoms worsening. "
        "She feels guilty about calling in sick and leaving colleagues short-staffed. She has avoided the "
        "hospital canteen because cooking smells worsen her wheeze."
    ),
    chunk("sarah-mitchell", "asthma", "vitals",
        "On presentation: BP 122/78 mmHg, HR 98 bpm (mildly elevated — salbutamol overuse and anxiety), "
        "RR 22 breaths/min (elevated), temperature 37.2°C (afebrile), SpO₂ 93% on room air (reduced). "
        "Bilateral expiratory wheeze. Speaking in full sentences with mild effort. Peak flow approximately "
        "65% of predicted. Mildly distressed appearance."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # SARAH MITCHELL × PNEUMONIA
    # ════════════════════════════════════════════════════════════════════════
    chunk("sarah-mitchell", "pneumonia", "identity_demographics",
        "Sarah Mitchell is a 28-year-old female nurse on a medical ward. She is anxious, speaks quickly, "
        "and downplays symptoms to avoid seeming dramatic. As a nurse she has clinical insight — she knows "
        "what pleuritic pain means — which makes her more scared, not less. She asks questions back and "
        "needs direct prompting to fully disclose how unwell she feels."
    ),
    chunk("sarah-mitchell", "pneumonia", "chief_complaint",
        "Sarah presents with a productive cough with yellow-green sputum, high fever, and right-sided sharp "
        "chest pain that is worse on deep breathing. The cough started four days ago and has worsened. A "
        "colleague checked her oxygen with a pulse oximeter and it read 91%, which alarmed her."
    ),
    chunk("sarah-mitchell", "pneumonia", "hpc_narrative",
        "Sarah's illness began five days ago with a runny nose and sore throat — she assumed she had caught "
        "something from a patient. Three days ago the cough became productive with yellow-green mucus. She "
        "developed a fever of 38.7°C with drenching night sweats and rigors. Two days ago she developed sharp "
        "right-sided chest pain — pleuritic in nature — that she recognised immediately from her nursing experience. "
        "She came in today because her breathing worsened overnight and a colleague's pulse oximeter showed 91%, "
        "which she knew was not acceptable. She has been off work since yesterday. She is frustrated and scared."
    ),
    chunk("sarah-mitchell", "pneumonia", "symptom_breakdown_socrates",
        "Cough — Site: chest, productive. Onset: 4–5 days ago, initially dry then productive after 2 days. "
        "Character: productive cough with yellow-green sputum, approximately one teaspoon per episode; "
        "she notes the sputum has a foul smell if directly asked. Radiation: N/A. "
        "Associations: right-sided pleuritic chest pain, fever, rigors, breathlessness, night sweats. "
        "Time course: continuous, progressively worsening over 5 days. "
        "Exacerbating: deep breathing and coughing worsen chest pain; lying on left side. "
        "Relieving: sitting upright, Paracetamol partially reduces fever. "
        "Severity: 7/10 overall; pleuritic pain 6/10."
    ),
    chunk("sarah-mitchell", "pneumonia", "associated_symptoms",
        "Sarah has a fever of 38.7°C measured at home. She has had rigors — uncontrollable shivering episodes. "
        "She has right-sided pleuritic chest pain: sharp, worse on deep inspiration and on coughing. She has "
        "progressive breathlessness. She has drenching night sweats. She has reduced appetite and general malaise. "
        "She has a mild headache."
    ),
    chunk("sarah-mitchell", "pneumonia", "pertinent_negatives",
        "Sarah denies haemoptysis. She has no wheeze — she notes this feels completely different from her asthma. "
        "She has no leg swelling or calf pain. She has no rash. She has not recently travelled abroad. "
        "She denies any TB contacts. She has no neck stiffness or photophobia. She has not changed any medications."
    ),
    chunk("sarah-mitchell", "pneumonia", "past_medical_history",
        "Mild asthma since childhood, diagnosed age 6. One hospitalisation at age 14 for a severe asthma attack. "
        "No other chronic medical conditions. No prior pneumonia or serious respiratory illness."
    ),
    chunk("sarah-mitchell", "pneumonia", "past_surgical_history",
        "No surgical procedures. No hospital admissions since age 14. Never been intubated."
    ),
    chunk("sarah-mitchell", "pneumonia", "medications_and_adherence",
        "Salbutamol PRN inhaler — not using it much currently as this presentation feels different from asthma. "
        "She started Paracetamol 1g four times daily (bought over the counter) two days ago for fever and "
        "pleuritic pain. She has not started any antibiotics."
    ),
    chunk("sarah-mitchell", "pneumonia", "allergies",
        "Penicillin allergy — widespread red itchy rash within hours of first dose at age 10. Resolved with "
        "antihistamines. This is a critically important allergy: she must NOT be given penicillin-based antibiotics "
        "such as Amoxicillin. Alternative antibiotics (e.g. Doxycycline, Clarithromycin) must be used."
    ),
    chunk("sarah-mitchell", "pneumonia", "family_history",
        "Mother has Type 2 diabetes. Father alive and well. No family history of cardiac disease, TB, "
        "immunodeficiency, or recurrent infections."
    ),
    chunk("sarah-mitchell", "pneumonia", "social_history",
        "Non-smoker. Occasional alcohol on weekends. Works as a nurse on a busy medical ward — high occupational "
        "exposure to respiratory pathogens. Lives alone in a slightly damp ground-floor flat. Has not been in "
        "contact with anyone with confirmed TB. Not vaccinated against influenza this season (has not had time)."
    ),
    chunk("sarah-mitchell", "pneumonia", "risk_factors",
        "Primary risk factor: occupational exposure to respiratory pathogens on a medical ward. Her mild asthma "
        "may make her lungs more susceptible to infection. Rotating night shifts cause sleep deprivation, reducing "
        "immune function. No influenza vaccination this season. Damp flat may be an additional factor. She is "
        "otherwise young and healthy with no immunosuppression."
    ),
    chunk("sarah-mitchell", "pneumonia", "ice",
        "Ideas: Sarah is fairly certain she has pneumonia based on her nursing knowledge — the pleuritic pain, "
        "productive purulent cough, and fever are, in her words, 'textbook.' She is frustrated she got it. "
        "Concerns: She is worried about her SpO₂ of 91% and whether she needs to be admitted. She is also "
        "concerned about passing infection to vulnerable patients when she returns to work. "
        "Expectations: She expects antibiotics today (mindful of her Penicillin allergy), a chest X-ray, "
        "and clear guidance on when she can safely return to clinical work."
    ),
    chunk("sarah-mitchell", "pneumonia", "functional_impact",
        "Sarah has been unable to work for two days. She is sleeping poorly due to night sweats and pleuritic "
        "pain. She cannot take a deep breath without significant pain. She has barely eaten. She lives alone "
        "and has no one to look after her, which adds to her distress."
    ),
    chunk("sarah-mitchell", "pneumonia", "vitals",
        "On presentation: BP 108/72 mmHg (mildly low — fever and dehydration), HR 104 bpm (tachycardic), "
        "RR 24 breaths/min (elevated), temperature 38.9°C (fever), SpO₂ 91% on room air (concerning). "
        "Flushed and visibly unwell. Dullness to percussion at right base. Reduced breath sounds and coarse "
        "crackles at right lower zone. Pleural rub may be audible."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # JAMES OKAFOR × AORTIC STENOSIS
    # ════════════════════════════════════════════════════════════════════════
    chunk("james-okafor", "aortic-stenosis", "identity_demographics",
        "James Okafor is a 55-year-old retired secondary school teacher. He is stoic and reluctant to admit "
        "anything is wrong. He uses humour to deflect — 'I'm fine, just getting old' or 'probably just the "
        "dodgy kebab I had last night.' He does not call chest pain 'pain' — he says 'pressure', 'tightness', "
        "or 'a funny feeling.' He only gives full detail when directly and specifically pressed."
    ),
    chunk("james-okafor", "aortic-stenosis", "chief_complaint",
        "James presents with a tight feeling in his chest that comes on walking uphill or climbing stairs, "
        "and one episode of near-fainting three weeks ago. He has had this for about six months and has been "
        "dismissing it as 'getting unfit since I retired.'"
    ),
    chunk("james-okafor", "aortic-stenosis", "hpc_narrative",
        "James first noticed chest tightness six months ago walking his dog up a hill — he stopped, rested, "
        "and it resolved in a few minutes. He put it down to being out of shape. Over the following months "
        "the tightness came on with progressively less effort — now it occurs walking at a normal pace for "
        "more than five minutes. Three weeks ago he nearly fainted climbing the stairs at home and had to grab "
        "the bannister; his vision 'went grey' and he had to sit on the step. He recovered in two minutes. "
        "His wife insisted he come in. He has also become breathless more easily but attributes this to age. "
        "He has no symptoms at rest."
    ),
    chunk("james-okafor", "aortic-stenosis", "symptom_breakdown_socrates",
        "Chest tightness — Site: central, retrosternal. Onset: 6 months ago, gradually worsening. "
        "Character: pressure or tightness, 'like something heavy on my chest'; he refuses to call it pain. "
        "Radiation: toward the jaw if directly asked — he initially denies this. "
        "Associations: exertional breathlessness, fatigue, one near-syncopal episode, bilateral ankle oedema. "
        "Time course: occurs with exertion, resolves within 2–5 minutes of rest. "
        "Exacerbating: walking uphill, climbing stairs, carrying shopping. "
        "Relieving: stopping and resting. "
        "Severity: he says 4/10 but minimises — clinically consistent with 6–7/10."
    ),
    chunk("james-okafor", "aortic-stenosis", "associated_symptoms",
        "James has exertional breathlessness — he can no longer walk up the hill near his house. He had one "
        "near-syncopal episode on the stairs three weeks ago: felt very dizzy, vision went grey, had to sit "
        "down, recovered in two minutes. He has bilateral ankle swelling by end of day. He has fatigue and "
        "reduced exercise tolerance compared to six months ago."
    ),
    chunk("james-okafor", "aortic-stenosis", "pertinent_negatives",
        "James denies chest pain at rest. He denies palpitations. He has no productive cough or fever. "
        "He has no haemoptysis. He has no pleuritic chest pain. He has no leg pain on walking. He has not "
        "had a prior heart attack or cardiac procedure. He has no history of rheumatic fever."
    ),
    chunk("james-okafor", "aortic-stenosis", "past_medical_history",
        "Hypertension diagnosed 8 years ago — lifestyle measures initially, then Amlodipine added 6 years ago. "
        "Ex-smoker with 20 pack-year history (smoked 20/day for 20 years, quit 10 years ago). No prior cardiac "
        "events or myocardial infarction. He was told several years ago at a routine check that he had 'a slight "
        "murmur' but was not investigated further at that time."
    ),
    chunk("james-okafor", "aortic-stenosis", "past_surgical_history",
        "Appendicectomy at age 23, uncomplicated. No other surgeries. No prior cardiac procedures or interventions."
    ),
    chunk("james-okafor", "aortic-stenosis", "medications_and_adherence",
        "Amlodipine 5mg once daily for hypertension — takes it most days but forgets at weekends. "
        "Aspirin 75mg once daily — prescribed by GP for cardiovascular risk reduction. "
        "Occasional Ibuprofen for back pain — 'not often.' No other regular medications."
    ),
    chunk("james-okafor", "aortic-stenosis", "allergies",
        "No known drug allergies. No food allergies. No prior adverse drug reactions."
    ),
    chunk("james-okafor", "aortic-stenosis", "family_history",
        "Father had a myocardial infarction at age 61 and died from a second heart attack at 65. Mother had "
        "hypertension and died of a stroke at 72. Brother has COPD (still smokes). James has two adult children "
        "who are both well. Strong family history of premature cardiovascular disease."
    ),
    chunk("james-okafor", "aortic-stenosis", "social_history",
        "Ex-smoker — smoked 20 cigarettes/day for 20 years, quit 10 years ago (20 pack-years). He initially "
        "underreports this, saying 'I had the odd cigarette' — only admits 20 pack-years if directly pressed. "
        "Drinks 2–3 pints of beer on weekends. Retired 3 years ago, now largely sedentary. Lives with wife "
        "in a two-storey house. Has been walking the dog less due to his symptoms."
    ),
    chunk("james-okafor", "aortic-stenosis", "risk_factors",
        "Cardiovascular risk factors: male sex, age 55, hypertension (partially controlled), significant "
        "smoking history (20 pack-years), sedentary retirement lifestyle, family history of premature cardiac "
        "disease (father MI at 61). Previously documented murmur consistent with longstanding aortic stenosis. "
        "Calcific aortic stenosis is most likely given his age and risk profile."
    ),
    chunk("james-okafor", "aortic-stenosis", "ice",
        "Ideas: James privately suspects something is wrong with his heart but will not say so readily. "
        "He says 'I thought it might be my blood pressure playing up.' His wife pushed him to attend. "
        "Concerns: He is worried about having a heart attack like his father but will not admit this easily. "
        "He is also anxious about being told he needs an operation. He does not want to be a burden. "
        "Expectations: He expects to be told to take it easy and take some tablets. He does not want to be "
        "admitted. If directly asked, he will admit he hopes it is nothing serious."
    ),
    chunk("james-okafor", "aortic-stenosis", "functional_impact",
        "James can no longer walk his dog up the hill. He becomes breathless climbing the stairs at home. "
        "He has stopped gardening because it brings on the chest tightness. His near-syncopal episode has made "
        "him anxious about being home alone and he now avoids the stairs when possible."
    ),
    chunk("james-okafor", "aortic-stenosis", "vitals",
        "On presentation: BP 148/88 mmHg (hypertensive, narrow pulse pressure — note: normal pulse pressure "
        "is ~40 mmHg; narrowed here at 60 mmHg), HR 76 bpm (regular), RR 18 breaths/min, temperature 37.3°C, "
        "SpO₂ 96% on room air. Harsh ejection systolic murmur at the right upper sternal edge radiating to "
        "the carotids. Slow-rising carotid pulse. Mild bilateral ankle oedema."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # JAMES OKAFOR × MITRAL STENOSIS
    # ════════════════════════════════════════════════════════════════════════
    chunk("james-okafor", "mitral-stenosis", "identity_demographics",
        "James Okafor is a 55-year-old retired teacher. Stoic, deflects with humour, minimises symptoms. "
        "He says 'I'm fine' when he is not. He came in because his wife insisted. He will only disclose the "
        "full picture — including that he coughed up blood — when directly and specifically asked."
    ),
    chunk("james-okafor", "mitral-stenosis", "chief_complaint",
        "James presents with worsening breathlessness — especially at night — and episodic palpitations over "
        "the past three months. He says 'I get a bit puffed and my heart goes a bit funny sometimes, nothing "
        "dramatic.' His wife disagrees."
    ),
    chunk("james-okafor", "mitral-stenosis", "hpc_narrative",
        "James has become progressively more breathless over the past 12 months, attributing it to age and "
        "inactivity. Three months ago he began waking at night unable to breathe comfortably unless propped "
        "on two pillows. He has had two episodes of fast, irregular palpitations lasting 20–30 minutes each, "
        "resolving spontaneously. His wife called him after the second episode last week because she found "
        "him pale and breathless at 2am. He has ankle swelling by evening. He admits — only if pressed — "
        "that he once coughed up a small amount of blood-tinged sputum. He recalls a severe illness at age "
        "12 with a bad sore throat, high fever, and swollen painful joints — he was hospitalised for a week "
        "and told 'something had happened to his heart,' but was given the all-clear at 18 and never followed up."
    ),
    chunk("james-okafor", "mitral-stenosis", "symptom_breakdown_socrates",
        "Dyspnoea — Site: diffuse bilateral. Onset: insidious over 12 months, acutely worse over 3 months. "
        "Character: unable to lie flat; orthopnoea (sleeps on 2 pillows); breathless at rest when supine. "
        "Radiation: N/A. Associations: palpitations (irregular fast episodes), ankle oedema, fatigue, one "
        "episode of haemoptysis. Time course: progressive and chronic; worsening over months. "
        "Exacerbating: exertion, lying flat. Relieving: sitting upright, rest. Severity: 6/10, significantly limiting."
    ),
    chunk("james-okafor", "mitral-stenosis", "associated_symptoms",
        "James has orthopnoea — cannot lie flat, sleeps on two pillows. He has had paroxysmal nocturnal "
        "dyspnoea on two occasions. He has bilateral ankle oedema, worse in the evenings. He has two episodes "
        "of irregular fast palpitations (20–30 minutes each). He has fatigue and reduced exercise tolerance. "
        "He had one episode of blood-tinged sputum — he downplays this as 'probably nothing' and only "
        "mentions it if directly asked about blood or unusual sputum."
    ),
    chunk("james-okafor", "mitral-stenosis", "pertinent_negatives",
        "James denies exertional chest tightness or angina-type pain. He denies fever or weight loss. "
        "He has no productive purulent cough. He denies recent sick contacts or TB exposure. He denies "
        "syncope. He has no current joint pain or swelling."
    ),
    chunk("james-okafor", "mitral-stenosis", "past_medical_history",
        "Rheumatic fever at age 12: severe sore throat, high fever, painful swollen joints (knees, ankles), "
        "hospitalised for one week with documented cardiac involvement — given the all-clear at 18 and never "
        "followed up. Hypertension diagnosed 8 years ago on Amlodipine. Ex-smoker (20 pack-years, quit 10 "
        "years ago). No prior cardiac procedures."
    ),
    chunk("james-okafor", "mitral-stenosis", "past_surgical_history",
        "Appendicectomy at age 23. No cardiac surgery or valvuloplasty. No prior admissions for cardiac disease."
    ),
    chunk("james-okafor", "mitral-stenosis", "medications_and_adherence",
        "Amlodipine 5mg once daily (hypertension). Aspirin 75mg once daily. No anticoagulants currently "
        "(AF not yet formally diagnosed or treated). No other medications. Adherence is inconsistent at weekends."
    ),
    chunk("james-okafor", "mitral-stenosis", "allergies",
        "No known drug or food allergies. No prior adverse drug reactions."
    ),
    chunk("james-okafor", "mitral-stenosis", "family_history",
        "Father MI at 61, died at 65. Mother hypertension, stroke at 72. Brother has COPD. No known family "
        "history of rheumatic fever or valvular heart disease."
    ),
    chunk("james-okafor", "mitral-stenosis", "social_history",
        "Ex-smoker, 20 pack-years — underreports initially. Drinks 2–3 pints beer at weekends. Retired, "
        "sedentary. Lives with wife. Has been sleeping in the recliner because lying flat worsens breathlessness."
    ),
    chunk("james-okafor", "mitral-stenosis", "risk_factors",
        "Primary risk factor: rheumatic fever at age 12 with documented cardiac involvement — the most common "
        "cause of mitral stenosis. Decades without follow-up allowed progressive valvular disease. Established "
        "paroxysmal AF is a complication of mitral stenosis and significantly increases stroke risk (currently "
        "not anticoagulated — a clinical risk). Additional risks: hypertension, smoking history."
    ),
    chunk("james-okafor", "mitral-stenosis", "ice",
        "Ideas: James thinks he is 'just tired' and that his heart is 'getting a bit dodgy with age.' He has "
        "not connected his current symptoms to his childhood illness. He uses humour: 'Probably the beer catching up.' "
        "Concerns: He is worried about the blood he coughed up — says 'I didn't mention it because I thought "
        "you'd make a fuss.' He privately worries it might be cancer. He is anxious about the palpitations. "
        "Expectations: He expects tablets and to be told to rest. He is hoping to avoid surgery."
    ),
    chunk("james-okafor", "mitral-stenosis", "functional_impact",
        "James cannot climb stairs without stopping. He is sleeping in a recliner chair rather than in bed. "
        "He has stopped walking the dog. He becomes breathless carrying shopping from the car to the kitchen. "
        "He feels exhausted by midday. His wife is increasingly worried about leaving him alone."
    ),
    chunk("james-okafor", "mitral-stenosis", "vitals",
        "On presentation: BP 142/88 mmHg, HR 88 bpm (irregularly irregular — consistent with AF), "
        "RR 20 breaths/min, temperature 37.1°C, SpO₂ 94% on room air. Malar flush present. "
        "Mid-diastolic rumble best heard at the apex in left lateral decubitus. Opening snap present. "
        "Bilateral basal crepitations. Bilateral pitting oedema to mid-calf."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # JAMES OKAFOR × COPD
    # ════════════════════════════════════════════════════════════════════════
    chunk("james-okafor", "copd", "identity_demographics",
        "James Okafor is a 55-year-old retired teacher. Stoic, reluctant to admit severity, uses humour. "
        "He has avoided the GP for years and is resistant to chronic diagnoses — especially anything linked "
        "to smoking, which he feels guilty about. He will minimise his smoking history unless pressed."
    ),
    chunk("james-okafor", "copd", "chief_complaint",
        "James presents with worsening breathlessness over the past week and a productive cough with "
        "increased yellow-green sputum. He has had a chronic morning cough for years but says this is "
        "'much worse than usual.' His wife made him come in."
    ),
    chunk("james-okafor", "copd", "hpc_narrative",
        "James has had a morning productive cough for at least 10 years — white or clear phlegm, which he "
        "has always dismissed as a 'smoker's cough' even after quitting. Over the past two to three years "
        "he has become progressively more breathless on exertion — he stopped walking the dog uphill and "
        "attributed it to being unfit. Over the past week he developed what he calls 'a chest infection': "
        "sputum turned yellow-green and increased in volume, breathlessness worsened, and he had a low "
        "fever. He has been unable to complete a sentence without pausing. His wife noticed he looked grey "
        "at breakfast and insisted he come in. He says 'I've had worse' — he has not."
    ),
    chunk("james-okafor", "copd", "symptom_breakdown_socrates",
        "Dyspnoea — Site: bilateral chest. Onset: chronic background over 2–3 years; acute-on-chronic "
        "worsening for 1 week. Character: exertional breathlessness at baseline, now breathless on minimal "
        "activity (walking to the kitchen). Radiation: N/A. "
        "Associations: chronic productive cough, purulent sputum this week, wheeze, chest tightness. "
        "Time course: chronic progressive background with acute infectious exacerbation. "
        "Exacerbating: exertion, cold air, respiratory infections. "
        "Relieving: sitting upright, rest; Salbutamol gives partial relief. "
        "Severity: 7/10 currently; he reports usual baseline as 3–4/10."
    ),
    chunk("james-okafor", "copd", "associated_symptoms",
        "James has a chronic morning productive cough — most mornings for years, white/clear phlegm baseline. "
        "This week sputum is yellow-green and increased in volume. He has a wheeze. He has chest tightness. "
        "He has a low fever (37.9°C yesterday). His exercise tolerance is markedly reduced — from 500m to "
        "under 100m. He has mild ankle swelling."
    ),
    chunk("james-okafor", "copd", "pertinent_negatives",
        "James denies haemoptysis (important to ask — would raise suspicion of malignancy given smoking history). "
        "He denies pleuritic chest pain. He has no night sweats. He denies weight loss (if present, this "
        "would prompt concern for lung cancer). He has no history of occupational dust or fume exposure beyond "
        "chalk dust from 30 years of teaching."
    ),
    chunk("james-okafor", "copd", "past_medical_history",
        "Hypertension, 8 years, on Amlodipine. Ex-smoker, 20 pack-years (quit 10 years ago). No formal COPD "
        "diagnosis — he has been avoiding the GP. No prior spirometry. Recurrent chest infections most winters "
        "for the past 5 years — he self-treats with rest and 'waits it out.'"
    ),
    chunk("james-okafor", "copd", "past_surgical_history",
        "Appendicectomy at age 23. No respiratory procedures. Never been ventilated or had non-invasive ventilation."
    ),
    chunk("james-okafor", "copd", "medications_and_adherence",
        "Amlodipine 5mg once daily. Aspirin 75mg once daily. He was given a Salbutamol inhaler by his GP "
        "two years ago 'for when breathing is bad' — uses it 2–3 times per week but has no formal COPD "
        "diagnosis or maintenance inhalers. No inhaled corticosteroids. Inconsistent adherence to Amlodipine."
    ),
    chunk("james-okafor", "copd", "allergies",
        "No known drug or food allergies."
    ),
    chunk("james-okafor", "copd", "family_history",
        "Father MI at 61. Mother hypertension and stroke. Brother has COPD (still smokes). No known family "
        "history of alpha-1 antitrypsin deficiency."
    ),
    chunk("james-okafor", "copd", "social_history",
        "Ex-smoker — 20 cigarettes/day for 20 years (20 pack-years); quit 10 years ago. Will minimise this "
        "initially. Drinks 2–3 pints beer at weekends. Retired and sedentary. Spent 30 years teaching in "
        "classrooms (chalk dust, dry air — minor occupational exposure). Lives with wife."
    ),
    chunk("james-okafor", "copd", "risk_factors",
        "Primary risk factor: significant smoking history (20 pack-years). Recurrent untreated winter chest "
        "infections (contributing to airway remodelling). No prior diagnosis or pulmonary rehabilitation. "
        "Sedentary lifestyle. Family history of COPD (brother). Minor occupational chalk dust exposure. "
        "Guilt about smoking makes him avoid healthcare engagement, leading to delayed diagnosis and treatment."
    ),
    chunk("james-okafor", "copd", "ice",
        "Ideas: James believes he has 'just a bad chest infection' that will clear up in a few days. He is "
        "resistant to the idea of a chronic condition — especially one linked to smoking. "
        "Concerns: His main worry (if pressed) is cancer — his brother's COPD and their father's death made "
        "him 'not think about it too hard.' He is also anxious about losing independence. "
        "Expectations: He expects antibiotics and to be sent home. He does not want a serious diagnosis. "
        "He is hoping the doctor will not focus too much on the smoking history."
    ),
    chunk("james-okafor", "copd", "functional_impact",
        "James can now walk only approximately 100 metres before stopping. He cannot walk the dog or do "
        "light gardening. He is sleeping poorly from nocturnal coughing. He feels exhausted. He cannot hold "
        "a full conversation without pausing to breathe. His wife is doing all the household tasks."
    ),
    chunk("james-okafor", "copd", "vitals",
        "On presentation: BP 144/88 mmHg, HR 92 bpm, RR 22 breaths/min, temperature 37.8°C, "
        "SpO₂ 88% on room air (significantly reduced — supplemental oxygen needed). Visibly using accessory "
        "muscles. Barrel chest. Bilateral wheeze and coarse crackles on auscultation. Pursed lip breathing."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # JAMES OKAFOR × PNEUMONIA
    # ════════════════════════════════════════════════════════════════════════
    chunk("james-okafor", "pneumonia", "identity_demographics",
        "James Okafor is a 55-year-old retired teacher. Stoic, downplays illness, came in only because his "
        "wife insisted. He will not volunteer the full picture — he needs direct, specific questions. He "
        "describes being unwell with understatement: 'a bit off' means significantly unwell."
    ),
    chunk("james-okafor", "pneumonia", "chief_complaint",
        "James presents with a productive cough, fever, and right-sided chest discomfort that is worse on "
        "deep breathing — he calls it 'a bit of a stitch.' This has been going on for four days. He says "
        "'it's just a chest cold, I'll be right.'"
    ),
    chunk("james-okafor", "pneumonia", "hpc_narrative",
        "James developed a sore throat and runny nose six days ago. Three days later his cough became "
        "productive with thick yellow sputum. He developed a fever two days ago (wife measured 38.5°C). "
        "He started taking Paracetamol with partial effect. He developed right-sided chest pain that catches "
        "on deep inspiration — he describes it as 'a stitch that won't go away.' He has been more breathless "
        "walking to the kitchen. His wife made him come today after he looked grey at breakfast and was unable "
        "to finish his sentence without catching his breath. He insists he would have been fine at home."
    ),
    chunk("james-okafor", "pneumonia", "symptom_breakdown_socrates",
        "Cough — Onset: 3–4 days ago, preceded by 3 days of URTI. Character: productive, yellow-green sputum, "
        "moderate volume; admits the sputum has 'a bit of a smell' if directly asked. "
        "Associations: right-sided pleuritic 'stitch', fever, rigors, breathlessness, malaise. "
        "Time course: continuous, worsening over 4 days. "
        "Exacerbating: deep breathing worsens chest pain; exertion worsens breathlessness. "
        "Relieving: Paracetamol partially reduces fever. Severity: he says 5/10 — clinically 7/10."
    ),
    chunk("james-okafor", "pneumonia", "associated_symptoms",
        "James has a fever of 38.5°C (measured at home). He has right-sided pleuritic chest pain — sharp, "
        "worse on deep inspiration and coughing. He had one rigor last night — describes it as 'the shakes, "
        "a bit weird.' He is breathless on minimal exertion. He has general malaise and fatigue. He has a "
        "poor appetite and mild nausea."
    ),
    chunk("james-okafor", "pneumonia", "pertinent_negatives",
        "James denies haemoptysis. He has no wheeze. He has no leg swelling. He has no rash. He denies "
        "recent foreign travel. He denies TB contacts. He has not changed any medications recently."
    ),
    chunk("james-okafor", "pneumonia", "past_medical_history",
        "Hypertension, 8 years. Ex-smoker, 20 pack-years. Recurrent winter chest infections (2–3 per year "
        "for the past 5 years), previously managed by GP with antibiotics. No formal COPD diagnosis. No prior "
        "hospital admissions for pneumonia."
    ),
    chunk("james-okafor", "pneumonia", "past_surgical_history",
        "Appendicectomy at age 23. No other procedures."
    ),
    chunk("james-okafor", "pneumonia", "medications_and_adherence",
        "Amlodipine 5mg once daily. Aspirin 75mg once daily. Salbutamol PRN (uses rarely). Paracetamol 1g "
        "four times daily started two days ago by himself for fever and pleuritic pain."
    ),
    chunk("james-okafor", "pneumonia", "allergies",
        "No known drug or food allergies."
    ),
    chunk("james-okafor", "pneumonia", "family_history",
        "Father MI at 61. Mother stroke at 72. Brother COPD. No family history of immunodeficiency or TB."
    ),
    chunk("james-okafor", "pneumonia", "social_history",
        "Ex-smoker, 20 pack-years — will minimise initially. Drinks 2–3 pints beer at weekends. Retired, "
        "sedentary. Lives with wife. No sick contacts with TB. No recent travel."
    ),
    chunk("james-okafor", "pneumonia", "risk_factors",
        "Significant smoking history (ex-smoker, 20 pack-years) impairing mucociliary clearance. Age 55. "
        "Possible undiagnosed COPD (recurrent chest infections, chronic productive cough). Recurrent winter "
        "chest infections suggest impaired respiratory defence. Stoicism has delayed presentation, leading "
        "to more advanced infection at assessment. No influenza vaccination confirmed."
    ),
    chunk("james-okafor", "pneumonia", "ice",
        "Ideas: James believes he has 'a bad cold that went to the chest.' He resists any suggestion it is "
        "more serious. "
        "Concerns: If pressed, he admits he is worried — 'last time I felt this bad I was in hospital' "
        "(a chest infection a decade ago). He is also worried about being admitted and being away from home. "
        "Expectations: He expects antibiotics and to be sent home. He will say 'I've got a dog to look after.'"
    ),
    chunk("james-okafor", "pneumonia", "functional_impact",
        "James cannot walk to the kitchen without breathlessness. He has been on the sofa for two days. "
        "He has not eaten a proper meal in two days. He is sleeping poorly. His wife is managing everything."
    ),
    chunk("james-okafor", "pneumonia", "vitals",
        "On presentation: BP 136/84 mmHg, HR 106 bpm (tachycardic), RR 26 breaths/min (elevated), "
        "temperature 38.8°C (fever), SpO₂ 90% on room air (significantly reduced). Appears flushed and unwell. "
        "Dullness to percussion at right base. Bronchial breathing and crackles at the right lower zone."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # MARGARET CHEN × AORTIC STENOSIS
    # ════════════════════════════════════════════════════════════════════════
    chunk("margaret-chen", "aortic-stenosis", "identity_demographics",
        "Margaret Chen is a 67-year-old retired woman. She is warm, friendly, and chatty — she goes on "
        "tangents and provides extensive context around her symptoms. She knows her medications by colour "
        "rather than name ('the little white one', 'the blood thinner'). She is not alarmed by her health — "
        "she has dealt with conditions before — but she wants reassurance. She speaks like a grandmother "
        "talking to someone she trusts."
    ),
    chunk("margaret-chen", "aortic-stenosis", "chief_complaint",
        "Margaret presents with increasing breathlessness over six months and dizziness when she exerts "
        "herself, including one near-fainting episode on the stairs two months ago. She says 'I just get so "
        "puffed, dear — it started around my birthday. My daughter noticed before I did, actually.'"
    ),
    chunk("margaret-chen", "aortic-stenosis", "hpc_narrative",
        "Margaret began noticing breathlessness on exertion approximately six months ago — initially only on "
        "steep hills, then on stairs, now even walking to the corner shop. She mentions the near-fainting "
        "episode almost as an aside while describing a family dinner: 'I had to sit on my daughter's stairs, "
        "felt very dizzy, like I might go — it passed after a minute or two.' She has also had a tight "
        "feeling across her chest on exertion which she describes as 'a bit of a squeeze, not really pain.' "
        "She is not alarmed — 'at my age, you expect things to slow down.' Her daughter brought her in after "
        "noticing she was struggling more than usual."
    ),
    chunk("margaret-chen", "aortic-stenosis", "symptom_breakdown_socrates",
        "Chest tightness and dyspnoea — Site: central chest tightness; bilateral breathlessness. "
        "Onset: 6 months, gradually worsening. Character: a 'squeeze', 'not really pain'. "
        "Radiation: to the left shoulder on one occasion, if directly asked. "
        "Associations: exertional breathlessness, dizziness, fatigue, ankle oedema, known AF. "
        "Time course: exertional, resolves with 3–5 minutes of rest. "
        "Exacerbating: walking uphill, climbing stairs, carrying shopping bags. "
        "Relieving: sitting down, resting. Severity: 'not too bad, dear' — clinically 6/10."
    ),
    chunk("margaret-chen", "aortic-stenosis", "associated_symptoms",
        "Margaret has exertional breathlessness now limiting her to flat ground only. She had one near-syncopal "
        "episode on stairs two months ago — dizziness, vision dimmed, sat down, recovered in 1–2 minutes. "
        "She has bilateral ankle swelling noticed by evening. She has afternoon fatigue — she now naps, which "
        "she never used to do. She has mild exertional chest tightness. She mentions her heart 'flutters "
        "sometimes' — her known AF."
    ),
    chunk("margaret-chen", "aortic-stenosis", "pertinent_negatives",
        "Margaret denies pleuritic chest pain. She has no productive cough or fever. She has no haemoptysis. "
        "She denies new palpitations beyond her known AF. She has no leg pain on walking. She denies any "
        "recent falls or collapse (the near-syncope was near-not-quite). She has no weight loss."
    ),
    chunk("margaret-chen", "aortic-stenosis", "past_medical_history",
        "Hypertension (longstanding, on treatment). Atrial fibrillation — diagnosed 5 years ago, on Warfarin "
        "and Bisoprolol. Mild osteoarthritis — knees and hands. Left hip replacement 4 years ago, uneventful. "
        "She was told about 'a slight murmur' at a routine check approximately 8 years ago but was reassured "
        "and not investigated further at the time."
    ),
    chunk("margaret-chen", "aortic-stenosis", "past_surgical_history",
        "Left hip replacement 4 years ago — uneventful recovery. No cardiac procedures. No other surgeries."
    ),
    chunk("margaret-chen", "aortic-stenosis", "medications_and_adherence",
        "Warfarin (she calls it 'the blood thinner' — dose varies, monitored at INR clinic monthly). "
        "Bisoprolol 2.5mg once daily (she calls it 'the little white heart tablet'). "
        "Ramipril 5mg once daily. Paracetamol PRN for arthritis. "
        "She takes her medications reliably every morning but does not reliably know their names."
    ),
    chunk("margaret-chen", "aortic-stenosis", "allergies",
        "Sulfonamides — caused facial puffiness/swelling when given trimethoprim-sulfamethoxazole for a UTI "
        "12 years ago. She calls it 'a sulfa drug allergy' and carries a letter from her GP. No other allergies."
    ),
    chunk("margaret-chen", "aortic-stenosis", "family_history",
        "Mother had rheumatic fever as a child and died in her 70s of 'heart problems.' Sister has heart "
        "failure and is on multiple medications. Her late husband had Type 2 diabetes. No family history of "
        "sudden cardiac death. Mother's rheumatic history may be relevant to valvular aetiology."
    ),
    chunk("margaret-chen", "aortic-stenosis", "social_history",
        "Non-smoker. Occasional small glass of wine with Sunday dinner. Retired. Lives alone since her husband "
        "passed away 3 years ago. Active in her church community and a local knitting group. Daughter visits "
        "twice weekly. Lives in a ground-floor flat."
    ),
    chunk("margaret-chen", "aortic-stenosis", "risk_factors",
        "Risk factors for calcific aortic stenosis: age (67), female sex, longstanding hypertension, prior "
        "documented murmur (8 years ago), possible rheumatic fever history (mother had confirmed rheumatic "
        "fever). Known AF may be a consequence of pressure-overload cardiomyopathy. Warfarin use means INR "
        "status is relevant to any planned procedural intervention."
    ),
    chunk("margaret-chen", "aortic-stenosis", "ice",
        "Ideas: Margaret thinks she is 'just getting old' and that her blood pressure tablets may need "
        "adjusting. She says 'I thought maybe my ticker was playing up a bit more than usual.' "
        "Concerns: She is worried about being a burden on her daughter. She is also worried about the "
        "dizziness — 'my friend Doris had a fall and broke her hip, and I really don't want that.' She is "
        "privately worried she might be developing heart failure like her sister. "
        "Expectations: She hopes the doctor can adjust her medications. She wants reassurance. She is hoping "
        "not to need to stay in hospital."
    ),
    chunk("margaret-chen", "aortic-stenosis", "functional_impact",
        "Margaret can no longer walk to the corner shop (400m) without stopping. She has stopped attending "
        "her knitting group because the hall has stairs. She has moved her bed to the ground floor. She naps "
        "every afternoon from fatigue. She has stopped gardening, which she used to love. She feels she is "
        "becoming housebound."
    ),
    chunk("margaret-chen", "aortic-stenosis", "vitals",
        "On presentation: BP 152/78 mmHg (narrowed pulse pressure of 74 mmHg), HR 72 bpm (rate-controlled AF — "
        "irregularly irregular), RR 18 breaths/min, temperature 36.8°C, SpO₂ 95% on room air. "
        "Harsh ejection systolic murmur at right upper sternal edge radiating to carotids. Slow-rising carotid "
        "pulse. Soft S2. Mild bilateral pitting oedema at the ankles."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # MARGARET CHEN × MITRAL STENOSIS
    # ════════════════════════════════════════════════════════════════════════
    chunk("margaret-chen", "mitral-stenosis", "identity_demographics",
        "Margaret Chen is a 67-year-old retired woman. Warm, chatty, goes on tangents, gives rich context "
        "with every answer. She knows her medications by colour, not name. She is not anxious but wants "
        "reassurance. She will mention the haemoptysis episode only if directly asked — she did not want to "
        "worry her daughter."
    ),
    chunk("margaret-chen", "mitral-stenosis", "chief_complaint",
        "Margaret presents with worsening breathlessness over the past year and palpitations. She says 'I "
        "just can't do what I used to, and my heart goes all funny sometimes — like it's doing a little dance.'"
    ),
    chunk("margaret-chen", "mitral-stenosis", "hpc_narrative",
        "Margaret has had breathlessness on exertion for several years, initially attributed to age and "
        "weight. Over the past 12 months it has significantly worsened — she can now walk no more than 200 "
        "metres on flat ground. Eight months ago she was diagnosed with atrial fibrillation and started on "
        "Warfarin and Bisoprolol; her breathlessness improved briefly but has worsened again over the past "
        "three months. She now sleeps on two pillows. She woke one night at midnight unable to breathe and "
        "called her daughter in a panic. Three weeks ago she coughed up a small amount of blood-tinged sputum "
        "— she did not tell her daughter but has been thinking about it ever since. She recalls frequent "
        "sore throats in childhood; her mother had confirmed rheumatic fever."
    ),
    chunk("margaret-chen", "mitral-stenosis", "symptom_breakdown_socrates",
        "Dyspnoea — Site: diffuse bilateral. Onset: progressive over years, markedly worse over 12 months. "
        "Character: breathless on mild exertion; orthopnoea (two-pillow); one episode of PND. "
        "Radiation: N/A. Associations: palpitations (known AF), ankle swelling, fatigue, haemoptysis episode. "
        "Time course: progressive, chronic, worsening over months. "
        "Exacerbating: exertion, lying flat, emotional upset. "
        "Relieving: sitting upright, rest. Severity: 7/10, significantly limiting daily life."
    ),
    chunk("margaret-chen", "mitral-stenosis", "associated_symptoms",
        "Margaret has orthopnoea (two-pillow). She had one episode of PND (woke at midnight, scared, called "
        "her daughter). She has bilateral ankle oedema. She has palpitations — her known AF, ongoing, "
        "irregularly irregular. She had one episode of blood-tinged haemoptysis three weeks ago (small amount, "
        "only mentions if directly asked). She has fatigue. Her cheeks have been 'permanently rosy' for years "
        "— she thought it was rosacea (malar flush)."
    ),
    chunk("margaret-chen", "mitral-stenosis", "pertinent_negatives",
        "Margaret denies central chest pain or exertional chest tightness. She has no fever. She denies "
        "weight loss. She has no productive purulent cough beyond the haemoptysis episode. She has no recent "
        "infections or sick contacts. She denies any current joint pain."
    ),
    chunk("margaret-chen", "mitral-stenosis", "past_medical_history",
        "Hypertension (longstanding). Atrial fibrillation (diagnosed 5 years ago — on Warfarin and Bisoprolol). "
        "Mild osteoarthritis. Left hip replacement 4 years ago. She was told about a heart murmur in her 40s. "
        "She does not recall having rheumatic fever but had frequent sore throats as a child. Her mother had "
        "confirmed rheumatic fever."
    ),
    chunk("margaret-chen", "mitral-stenosis", "past_surgical_history",
        "Left hip replacement 4 years ago, uneventful. No cardiac surgery or valvuloplasty. Never had a "
        "valve replacement."
    ),
    chunk("margaret-chen", "mitral-stenosis", "medications_and_adherence",
        "Warfarin (INR target 2–3, attends INR clinic monthly — she calls it 'the blood thinner'). "
        "Bisoprolol 2.5mg once daily ('the little white heart tablet'). Ramipril 5mg once daily. "
        "Paracetamol PRN for arthritis. Adherent to all medications — takes them every morning."
    ),
    chunk("margaret-chen", "mitral-stenosis", "allergies",
        "Sulfonamides — facial swelling. Occurred with trimethoprim-sulfamethoxazole 12 years ago. "
        "No other known drug or food allergies."
    ),
    chunk("margaret-chen", "mitral-stenosis", "family_history",
        "Mother had confirmed rheumatic fever and died of heart problems in her 70s. Sister has heart failure "
        "(on multiple medications). Late husband had Type 2 diabetes. No other family history of valvular "
        "heart disease known."
    ),
    chunk("margaret-chen", "mitral-stenosis", "social_history",
        "Non-smoker. Occasional small glass of wine. Retired. Lives alone since husband died 3 years ago. "
        "Daughter visits twice weekly. Lives in a ground-floor flat. Has been sleeping in the armchair some "
        "nights because lying in bed worsens her breathing."
    ),
    chunk("margaret-chen", "mitral-stenosis", "risk_factors",
        "Primary risk factor: likely subclinical rheumatic fever given mother's confirmed rheumatic fever "
        "and her own history of frequent childhood sore throats and later discovery of a murmur. Established "
        "AF is both a consequence and exacerbating factor. Warfarin is critical — stroke prevention in "
        "rheumatic mitral stenosis with AF. Decades without follow-up after murmur discovery allowed "
        "progressive valvular disease."
    ),
    chunk("margaret-chen", "mitral-stenosis", "ice",
        "Ideas: Margaret thinks her heart is 'getting worse' and is unsure why. She connects the breathing "
        "worsening to her heart but does not understand the valve mechanism. "
        "Concerns: She is worried about the blood she coughed up — says 'I didn't tell my daughter because "
        "I didn't want to worry her, but I've been thinking about it ever since.' She is worried about dying "
        "alone. She privately worries it could be cancer. "
        "Expectations: She wants to know why she coughed up blood. She hopes her medications can be adjusted. "
        "She says 'I'll do whatever you say — I trust you.'"
    ),
    chunk("margaret-chen", "mitral-stenosis", "functional_impact",
        "Margaret cannot walk to her church (600m). She has stopped attending community groups. She sleeps "
        "on two pillows and woke once gasping. She relies on her daughter for shopping. She has been sleeping "
        "in the armchair some nights. She feels increasingly housebound and describes it as 'like being a "
        "prisoner in my own flat.'"
    ),
    chunk("margaret-chen", "mitral-stenosis", "vitals",
        "On presentation: BP 154/90 mmHg, HR 84 bpm (irregularly irregular — AF), RR 20 breaths/min, "
        "temperature 36.9°C, SpO₂ 94% on room air. Malar flush visible. Mid-diastolic rumble at apex "
        "(best heard in left lateral decubitus). Opening snap present. Bilateral basal crepitations. "
        "Bilateral pitting oedema to the knee."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # DANIEL REYES × PNEUMONIA
    # ════════════════════════════════════════════════════════════════════════
    chunk("daniel-reyes", "pneumonia", "identity_demographics",
        "Daniel Reyes is a 42-year-old construction site manager. He is blunt, practical, and impatient. "
        "He came in because his wife made him — he would not have bothered otherwise. He has no medical "
        "vocabulary: 'heavy chest', 'can't get a breath', 'minging cough.' He gets irritated if asked the "
        "same thing twice. He underreports his smoking — says 'not much' or 'the odd one' — only admits "
        "10 cigarettes per day if directly pressed."
    ),
    chunk("daniel-reyes", "pneumonia", "chief_complaint",
        "Daniel presents with a bad productive cough, high fever, and right-sided chest pain when breathing "
        "in. His wife dragged him in this morning. He says 'I would've just toughed it out — it's probably "
        "just a chest thing.'"
    ),
    chunk("daniel-reyes", "pneumonia", "hpc_narrative",
        "Daniel started coughing more than usual about five days ago — he noted this but dismissed it since "
        "'I always cough a bit, I smoke.' Three days ago the cough became much worse, producing thick "
        "yellow-green sputum. Two days ago he developed a high fever (wife measured 38.8°C) and right-sided "
        "chest pain that catches sharply when he breathes in. Yesterday he was barely able to get through "
        "half a day on site before going home — 'which basically never happens.' His wife drove him in this "
        "morning after she said he looked grey. He is visibly irritated at being here."
    ),
    chunk("daniel-reyes", "pneumonia", "symptom_breakdown_socrates",
        "Cough — Onset: 5 days ago, worsening of baseline cough becoming purulent at day 3. "
        "Character: thick yellow-green sputum, moderate volume; he describes it as 'minging' if asked about "
        "the colour and smell. Radiation: N/A. "
        "Associations: right-sided pleuritic chest pain, fever, rigors, breathlessness, fatigue. "
        "Time course: continuous, rapidly worsening. "
        "Exacerbating: deep breathing, movement, coughing itself makes the chest pain worse. "
        "Relieving: shallow breathing; Ibuprofen helps slightly with fever. Severity: 7/10."
    ),
    chunk("daniel-reyes", "pneumonia", "associated_symptoms",
        "Daniel has a fever of 38.8°C. He has right-sided pleuritic chest pain — sharp, worse on deep "
        "inspiration and coughing. He had rigors last night — 'the shakes, which was weird.' He has "
        "significant fatigue, poor appetite, and has been breathless on moderate exertion."
    ),
    chunk("daniel-reyes", "pneumonia", "pertinent_negatives",
        "Daniel denies haemoptysis — but this question makes him visibly uneasy (father died of lung cancer). "
        "He has no wheeze. He has no leg swelling. He has no rash. He has not travelled recently. "
        "He denies weight loss. He has no TB contacts."
    ),
    chunk("daniel-reyes", "pneumonia", "past_medical_history",
        "No significant past medical history. Occasional back pain from physical work. No prior chest "
        "infections requiring hospitalisation. No respiratory diagnoses. Has not seen a GP in over three years."
    ),
    chunk("daniel-reyes", "pneumonia", "past_surgical_history",
        "Appendicectomy at age 34, uncomplicated. No other surgical history."
    ),
    chunk("daniel-reyes", "pneumonia", "medications_and_adherence",
        "Ibuprofen 400mg three times daily — currently taking for fever and pleuritic pain (bought over "
        "the counter). No regular medications. No inhalers. Has not started antibiotics."
    ),
    chunk("daniel-reyes", "pneumonia", "allergies",
        "No known drug or food allergies."
    ),
    chunk("daniel-reyes", "pneumonia", "family_history",
        "Father died of lung cancer at age 68 — was a heavy smoker. Mother alive and well, no significant "
        "conditions. No family history of immunodeficiency or TB."
    ),
    chunk("daniel-reyes", "pneumonia", "social_history",
        "Smoker — approximately 10 cigarettes per day. Will say 'not much' or 'the odd one' initially — "
        "only admits 10/day if directly asked. Drinks 3–4 cans of beer most evenings. Works as a construction "
        "site manager, physically demanding and high-stress. Lives with his wife and two teenage children. "
        "Has not seen a GP in over three years."
    ),
    chunk("daniel-reyes", "pneumonia", "risk_factors",
        "Active smoker (primary risk — impairs mucociliary clearance and immune response). Regular alcohol "
        "use (impairs immune function). Physically demanding outdoor work (dust, cold, wet). Poor healthcare "
        "engagement (three-year GP gap — delayed presentation). No vaccination history. Father's lung cancer "
        "death creates significant anxiety about any chest symptoms though Daniel will not admit this."
    ),
    chunk("daniel-reyes", "pneumonia", "ice",
        "Ideas: Daniel begrudgingly thinks it is a chest infection. He does not want to consider anything "
        "more serious. "
        "Concerns: He is privately worried about cancer because of his father — he will not say this unless "
        "directly and sensitively asked, and will likely deflect with 'nah, I'm sure it's nothing.' He is "
        "also worried about time off work — he has a major project deadline next week. "
        "Expectations: He wants antibiotics and to be sent home as quickly as possible. He will ask how long "
        "until he can return to site."
    ),
    chunk("daniel-reyes", "pneumonia", "functional_impact",
        "Daniel left site early yesterday for the first time in years. He is sleeping poorly. He cannot carry "
        "heavy materials without breathlessness. He has a major project deadline next week and is frustrated "
        "at being incapacitated. He feels being ill is a sign of weakness."
    ),
    chunk("daniel-reyes", "pneumonia", "vitals",
        "On presentation: BP 136/86 mmHg, HR 108 bpm (tachycardic), RR 26 breaths/min (elevated), "
        "temperature 39.1°C (high fever), SpO₂ 91% on room air (significantly reduced). Appears flushed "
        "and unwell — visibly uncomfortable with deep breaths. Dullness to percussion at right base. "
        "Coarse crackles and bronchial breathing at the right lower zone."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # DANIEL REYES × COPD
    # ════════════════════════════════════════════════════════════════════════
    chunk("daniel-reyes", "copd", "identity_demographics",
        "Daniel Reyes is a 42-year-old construction site manager. Blunt, stoic, resistant to chronic "
        "diagnoses. His wife made him come. He dismisses his symptoms as normal for 'someone who smokes and "
        "works hard.' He underreports smoking. He will be resistant to the idea of a long-term condition "
        "affecting his work."
    ),
    chunk("daniel-reyes", "copd", "chief_complaint",
        "Daniel presents with worsening breathlessness over the past week and a persistent productive cough "
        "with green sputum. He says 'I've always had a cough but this is different — I can't catch my "
        "breath doing normal things.'"
    ),
    chunk("daniel-reyes", "copd", "hpc_narrative",
        "Daniel has coughed most mornings for the past three to four years, producing white or clear phlegm "
        "— he has dismissed it as a 'smoker's cough.' Over the past two years his exercise tolerance has "
        "gradually declined — he used to manage full days on site without difficulty, now becomes breathless "
        "carrying heavy materials. He compensated by delegating more physical tasks. About 10 days ago he "
        "developed what he calls 'a chest infection' — sputum turned green and increased in volume, "
        "breathlessness worsened noticeably. His wife is worried. Daniel says 'I've had worse, I'll be fine.'"
    ),
    chunk("daniel-reyes", "copd", "symptom_breakdown_socrates",
        "Dyspnoea — Site: bilateral chest. Onset: background progressive over 2 years, acute-on-chronic "
        "worsening for 10 days. Character: exertional breathlessness at baseline, now breathless on minimal "
        "effort (walking across site or up a flight of stairs). "
        "Associations: chronic morning productive cough, increased purulent sputum this week, wheeze. "
        "Time course: chronic background with acute infective exacerbation. "
        "Exacerbating: exertion, cold air, dusty environments, respiratory infections. "
        "Relieving: rest; partial with bronchodilator (if used). Severity: 7/10 currently; usually 3/10."
    ),
    chunk("daniel-reyes", "copd", "associated_symptoms",
        "Daniel has a chronic morning productive cough (white/clear phlegm most days for years — he considers "
        "this normal and will not mention it unless asked). This week sputum is green and increased. He has "
        "a wheeze and chest tightness. He has fatigue. He is afebrile currently."
    ),
    chunk("daniel-reyes", "copd", "pertinent_negatives",
        "Daniel denies haemoptysis — this question visibly unsettles him (father's lung cancer). He denies "
        "pleuritic chest pain. He denies weight loss (important to exclude malignancy — any positive response "
        "would be significant). He has no night sweats. He has no ankle swelling currently. He is currently "
        "afebrile — important to distinguish from infective exacerbation with fever."
    ),
    chunk("daniel-reyes", "copd", "past_medical_history",
        "No formal diagnosis of any kind. Occasional back pain from physical work. No prior respiratory "
        "diagnoses. He has never had a breathing test (spirometry). He has never been prescribed inhalers. "
        "No prior hospitalisations. He has not seen a GP in years."
    ),
    chunk("daniel-reyes", "copd", "past_surgical_history",
        "Appendicectomy at age 34. No other procedures."
    ),
    chunk("daniel-reyes", "copd", "medications_and_adherence",
        "Ibuprofen PRN for back pain. No regular medications. No inhalers prescribed. He has never been "
        "assessed or treated for any respiratory condition."
    ),
    chunk("daniel-reyes", "copd", "allergies",
        "No known drug or food allergies."
    ),
    chunk("daniel-reyes", "copd", "family_history",
        "Father died of lung cancer at age 68 (heavy smoker). Mother alive and well. No known family history "
        "of alpha-1 antitrypsin deficiency or hereditary lung disease."
    ),
    chunk("daniel-reyes", "copd", "social_history",
        "Active smoker — approximately 10 cigarettes per day. Says 'not much' initially — only admits 10/day "
        "when pressed. Was heavier in his 20s (likely 15+ pack-years total). Drinks 3–4 cans of beer most "
        "evenings. Works in construction — significant exposure to dust, fumes, cold, and diesel exhaust. "
        "Lives with wife and two teenage children."
    ),
    chunk("daniel-reyes", "copd", "risk_factors",
        "Primary: active smoking (10 cigarettes/day for 15+ years — approximately 7.5–15 pack-years). "
        "Occupational dust and fume exposure (concrete, wood, silica, diesel exhaust) is a significant "
        "independent risk factor. Never had spirometry. Poor healthcare engagement prevents early diagnosis. "
        "Father's lung cancer death causes health anxiety about chest symptoms — making him simultaneously "
        "avoidant of investigation and privately terrified."
    ),
    chunk("daniel-reyes", "copd", "ice",
        "Ideas: Daniel thinks he has 'a chest infection that won't shift.' He resists any suggestion of a "
        "chronic condition — 'I'm not an old man.' "
        "Concerns: He is terrified of lung cancer (father died at 68 of it) but will not say so. Any "
        "question about haemoptysis or weight loss visibly unsettles him. He is also worried about his job — "
        "he cannot afford to be chronically unwell. "
        "Expectations: He wants antibiotics. He does not want a diagnosis of COPD or anything long-term. "
        "He will be resistant to smoking cessation advice unless approached very carefully."
    ),
    chunk("daniel-reyes", "copd", "functional_impact",
        "Daniel has had to delegate more physical tasks on site over the past year. He cannot carry heavy "
        "loads upstairs without stopping. He is sleeping poorly due to nocturnal coughing. He has been "
        "short-tempered at home, which concerns him. He is worried colleagues will notice he is struggling "
        "and lose confidence in him as site manager."
    ),
    chunk("daniel-reyes", "copd", "vitals",
        "On presentation: BP 138/84 mmHg, HR 96 bpm, RR 24 breaths/min, temperature 37.5°C (low-grade — "
        "afebrile range), SpO₂ 89% on room air (significantly reduced). Bilateral wheeze. Prolonged "
        "expiratory phase. Using accessory muscles. Barrel-chested appearance. No peripheral oedema currently."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # DANIEL REYES × ASTHMA  (occupational asthma)
    # ════════════════════════════════════════════════════════════════════════
    chunk("daniel-reyes", "asthma", "identity_demographics",
        "Daniel Reyes is a 42-year-old construction site manager. Blunt, impatient, came in reluctantly. "
        "He has no medical vocabulary. He is irritated by the idea that something on his worksite is making "
        "him ill — it implies a problem he cannot fix by toughing through it. He will ask practical questions: "
        "'Can I still go to work? Will this go away?'"
    ),
    chunk("daniel-reyes", "asthma", "chief_complaint",
        "Daniel presents with episodic breathlessness and wheeze that has developed over the past four "
        "months, strongly associated with his work environment. He notices his breathing is much better on "
        "weekends. He had a severe episode last week where his lips tingled and he had to leave site."
    ),
    chunk("daniel-reyes", "asthma", "hpc_narrative",
        "Over the past four months Daniel has noticed his chest going tight and wheezy when working in "
        "areas with a lot of dust or when workers nearby are spray-painting. He initially attributed it to "
        "'being around lads who smoke near the site.' Over the past two months he identified a clear pattern: "
        "weekends away from site, his breathing is normal; by Tuesday on site it worsens. Last week he had "
        "a severe episode — chest tightness, wheeze, tingling lips — and had to leave site for the first "
        "time. A colleague let him use his inhaler ('a blue one') which helped. He is annoyed and does not "
        "want to believe it is something serious."
    ),
    chunk("daniel-reyes", "asthma", "symptom_breakdown_socrates",
        "Breathlessness — Site: bilateral chest tightness. Onset: 4 months ago, insidiously; recognised "
        "as a pattern over 2 months. Character: chest goes 'tight and squeaky.' Radiation: none. "
        "Associations: wheeze, dry cough, lip tingling in worst episode, occasional runny nose at work. "
        "Time course: episodic, strongly occupational — worse mid-week on site, better on weekends (this "
        "is the key diagnostic feature of occupational asthma). "
        "Exacerbating: dusty environments on site, spray painting, cold air, diesel fumes. "
        "Relieving: leaving work environment, fresh air; a colleague's Salbutamol inhaler helped. "
        "Severity: usually 4–5/10; worst episode 8/10."
    ),
    chunk("daniel-reyes", "asthma", "associated_symptoms",
        "Daniel has a dry cough associated with the wheeze during episodes. He had perioral tingling (around "
        "the lips) during his worst episode last week. He occasionally has a runny nose at work. He has no "
        "sputum production during episodes."
    ),
    chunk("daniel-reyes", "asthma", "pertinent_negatives",
        "Daniel denies breathlessness at rest or at home on weekdays (key negative — distinguishes from "
        "COPD). He denies fever. He has no productive cough. He has no haemoptysis. He has no ankle swelling. "
        "He has no pleuritic pain. The clear occupational pattern with weekend improvement strongly "
        "distinguishes this from COPD or cardiac disease."
    ),
    chunk("daniel-reyes", "asthma", "past_medical_history",
        "No prior respiratory diagnosis. No childhood asthma. No allergies previously identified. Occasional "
        "back pain. He has not attended GP in years and has never been investigated for any respiratory issue."
    ),
    chunk("daniel-reyes", "asthma", "past_surgical_history",
        "Appendicectomy at age 34. No other surgical history."
    ),
    chunk("daniel-reyes", "asthma", "medications_and_adherence",
        "Ibuprofen PRN for back pain. No inhalers prescribed. He used a colleague's Salbutamol inhaler once "
        "during a severe episode on site — it helped significantly. He has not seen a GP about these episodes."
    ),
    chunk("daniel-reyes", "asthma", "allergies",
        "No previously known drug or food allergies. The occupational sensitisation is new — likely to "
        "isocyanates (spray paints) or construction dust (wood, concrete, silica)."
    ),
    chunk("daniel-reyes", "asthma", "family_history",
        "Father died of lung cancer at 68. Mother alive and well. No family history of asthma or atopic disease."
    ),
    chunk("daniel-reyes", "asthma", "social_history",
        "Active smoker — 10 cigarettes per day (underreports initially). Drinks 3–4 cans of beer most "
        "evenings. Works as construction site manager — daily exposure to concrete dust, wood dust, spray "
        "paints (containing isocyanates), diesel exhaust, and cold outdoor air. Lives with wife and two "
        "teenage children."
    ),
    chunk("daniel-reyes", "asthma", "risk_factors",
        "Occupational asthma sensitisers: isocyanates from spray paint, wood dust, concrete dust, silica — "
        "all common construction site exposures. Active smoking impairs airway defence and may worsen "
        "occupational sensitisation. Adult-onset asthma in this context is most consistent with occupational "
        "sensitisation (new exposure = new allergy). Ibuprofen use as a regular NSAID may worsen symptoms "
        "in aspirin-exacerbated respiratory disease — an important consideration."
    ),
    chunk("daniel-reyes", "asthma", "ice",
        "Ideas: Daniel thinks he is 'allergic to something at work' but has not connected it to a serious "
        "condition or considered it could be a long-term problem. "
        "Concerns: He is concerned about losing his job or having to change roles if he cannot go on site. "
        "His income depends on being operational. He is not particularly worried about his health per se — "
        "he is worried about work and money. "
        "Expectations: He wants 'something to sort it out' — preferably an inhaler. He does not want to be "
        "told to change jobs. He will ask: 'Can I go back to work tomorrow?'"
    ),
    chunk("daniel-reyes", "asthma", "functional_impact",
        "Daniel has had to leave site early three times in the past month. He avoids areas of the site where "
        "spray painting is happening, which limits his ability to supervise all areas. He has not been able "
        "to sleep better since weekends are symptom-free. He is worried his team will notice he is avoiding "
        "certain site areas."
    ),
    chunk("daniel-reyes", "asthma", "vitals",
        "On presentation (approximately 3 hours after last episode, which has now resolved): "
        "BP 134/84 mmHg, HR 94 bpm, RR 20 breaths/min, temperature 37.3°C, SpO₂ 95% on room air. "
        "Mild bilateral wheeze on forced expiration. Clinically improved from the acute episode. "
        "Peak flow approximately 75% of predicted. No accessory muscle use at rest."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # LEILA HASSAN × ASTHMA
    # ════════════════════════════════════════════════════════════════════════
    chunk("leila-hassan", "asthma", "identity_demographics",
        "Leila Hassan is a 19-year-old first-year university student. She is nervous, polite, and over-explains. "
        "This is only her second time in a hospital setting as an adult. She is apologetic — 'sorry, is that "
        "important?', 'I don't want to waste your time.' She often adds detail after a pause: 'Oh, and I "
        "forgot to mention...' She feels guilty about not taking her preventer inhaler regularly and will "
        "try to hide this initially."
    ),
    chunk("leila-hassan", "asthma", "chief_complaint",
        "Leila presents with worsening breathlessness, wheeze, and chest tightness over the past three days. "
        "She woke at 4am last night unable to breathe comfortably. She says 'I'm really sorry to bother "
        "you — I thought it would get better on its own.'"
    ),
    chunk("leila-hassan", "asthma", "hpc_narrative",
        "Leila's asthma has been more troublesome since she moved into student halls three weeks ago. She "
        "suspects the old carpet and mattress in her room are triggering it — she knows she is allergic to "
        "dust mites. Three days ago she woke wheezing and short of breath. Her Salbutamol inhaler only "
        "partially helped and the relief lasted less than two hours, so she used it again. She has been "
        "using it five to six times per day since then. She woke at 4am last night and sat up for over an "
        "hour before feeling better. Her flatmate was worried and insisted she come in this morning. She "
        "feels guilty because she knows she should have been taking her Clenil preventer inhaler every day "
        "but kept forgetting, especially the evening dose."
    ),
    chunk("leila-hassan", "asthma", "symptom_breakdown_socrates",
        "Breathlessness — Site: bilateral chest, diffuse tightness. Onset: 3 days of acute worsening; "
        "background asthma since childhood. Character: tight squeeze across the chest; audible wheeze on "
        "breathing out; dry irritating cough. Radiation: none. "
        "Associations: wheeze, dry nocturnal cough, chest tightness, fatigue from poor sleep, mild eczema "
        "flare on forearms. Time course: continuous for 3 days, worst at night and early morning. "
        "Exacerbating: dust in her room, cold air walking between campus buildings, any physical exertion, "
        "climbing stairs in halls. "
        "Relieving: Salbutamol inhaler (partial relief, lasting less than 2 hours — dangerously short); "
        "sitting upright; opening the window. Severity: 7/10; short sentences, visibly breathless."
    ),
    chunk("leila-hassan", "asthma", "associated_symptoms",
        "Leila has a dry irritating cough, worst at night — it woke her at 4am. She has bilateral wheeze "
        "she can hear herself. She has chest tightness. She has fatigue from two nights of disrupted sleep. "
        "She has a mild eczema flare on her forearms — often co-occurs with asthma exacerbations. She has "
        "a runny nose suggesting allergic rhinitis also triggered."
    ),
    chunk("leila-hassan", "asthma", "pertinent_negatives",
        "Leila denies any fever. She has no productive cough and no sputum. She has no pleuritic chest pain. "
        "She has no haemoptysis. She has no ankle swelling or palpitations. She has not been ill with a cold "
        "or respiratory infection recently. She has not eaten peanuts recently. She has not started any new "
        "medications."
    ),
    chunk("leila-hassan", "asthma", "past_medical_history",
        "Childhood asthma diagnosed at age 5. One A&E visit at age 12 for a severe asthma attack — given "
        "nebuliser and a short course of oral prednisolone, recovered fully. Eczema since infancy (mild, "
        "managed with emollients). Allergic rhinitis (hayfever in spring). No other medical conditions. "
        "She has the full atopic triad: asthma, eczema, allergic rhinitis."
    ),
    chunk("leila-hassan", "asthma", "past_surgical_history",
        "No surgical history. No hospital admissions since her A&E visit at age 12. Never been intubated."
    ),
    chunk("leila-hassan", "asthma", "medications_and_adherence",
        "Salbutamol 100mcg inhaler (blue reliever) — using 5–6 times per day for the past 3 days; normal "
        "use is once or twice per week. This overuse is a red flag for a severe exacerbation. "
        "Clenil Modulite 100mcg inhaler (brown preventer, beclometasone) — prescribed twice daily but she "
        "frequently forgets, especially the evening dose. She feels very guilty about this and initially "
        "tries to hide it: 'I take it... most of the time.' Only admit the full extent of non-adherence "
        "if directly and non-judgementally asked."
    ),
    chunk("leila-hassan", "asthma", "allergies",
        "House dust mites — worsens asthma and rhinitis symptoms significantly; the primary trigger for this "
        "admission. Mild peanut allergy — tingling in the mouth and mild lip swelling; has never required "
        "adrenaline. No drug allergies known."
    ),
    chunk("leila-hassan", "asthma", "family_history",
        "Mother has asthma — on regular inhalers. Father has hayfever. Maternal grandmother had eczema. "
        "No family history of anaphylaxis or severe allergic disease requiring hospital admission."
    ),
    chunk("leila-hassan", "asthma", "social_history",
        "Non-smoker, never smoked. Does not drink alcohol. First year undergraduate student, high academic "
        "stress — exams in two weeks. Lives in student halls with an old carpet and mattress (known dust mite "
        "reservoir). Has not yet obtained a dust mite mattress cover or allergen-proof bedding. Eats in the "
        "communal kitchen, careful to avoid peanut products."
    ),
    chunk("leila-hassan", "asthma", "risk_factors",
        "Primary triggers for this exacerbation: dust mite exposure in her new student halls room (old "
        "carpet, old mattress), cold air walking between campus buildings. Predisposing factors: non-adherence "
        "to preventer inhaler (leaves airways chronically inflamed and hyperresponsive), academic stress, "
        "disrupted sleep. Full atopic background (asthma + eczema + rhinitis) makes her highly susceptible."
    ),
    chunk("leila-hassan", "asthma", "ice",
        "Ideas: Leila thinks her asthma is flaring because of dust mites in her new room. She suspects the "
        "old carpet and mattress are to blame. She is probably correct. "
        "Concerns: She is worried about missing lectures — she is already behind. She is scared she will "
        "need to go to hospital. She is worried the doctor will be angry with her for not taking her preventer "
        "inhaler. She is also worried about her upcoming exams in two weeks. "
        "Expectations: She hopes to get a nebuliser, have her inhalers reviewed, and get advice on what to "
        "do about her room. She says 'I'll do whatever you say — I really want to get better.'"
    ),
    chunk("leila-hassan", "asthma", "functional_impact",
        "Leila has missed three days of lectures. She is sleeping poorly — waking nocturnally with wheeze. "
        "She cannot walk quickly between campus buildings without worsening breathlessness. She has been "
        "studying from her room, which is the very environment triggering her asthma. She is significantly "
        "behind on coursework and her anxiety about this is itself a potential trigger."
    ),
    chunk("leila-hassan", "asthma", "vitals",
        "On presentation: BP 114/72 mmHg, HR 104 bpm (elevated — partly from Salbutamol overuse), "
        "RR 24 breaths/min (elevated), temperature 37.4°C (afebrile), SpO₂ 92% on room air (reduced). "
        "Bilateral expiratory wheeze audible. Visibly using accessory muscles. Appears distressed. "
        "Peak flow approximately 55% of predicted — indicating a moderate-to-severe exacerbation."
    ),

    # ════════════════════════════════════════════════════════════════════════
    # LEILA HASSAN × PNEUMONIA
    # ════════════════════════════════════════════════════════════════════════
    chunk("leila-hassan", "pneumonia", "identity_demographics",
        "Leila Hassan is a 19-year-old first-year university student. Nervous, very polite, over-explains. "
        "Scared of medical settings. She will apologise repeatedly. Her flatmate — a nursing student — "
        "recognised the severity and insisted she come in. Leila will ask many questions and apologise for "
        "each one. She has background asthma, which complicates her presentation."
    ),
    chunk("leila-hassan", "pneumonia", "chief_complaint",
        "Leila presents with a productive cough, fever, and left-sided sharp chest pain that catches when "
        "she breathes in, for the past four days. She says 'I'm really sorry — I know you're probably very "
        "busy, but my flatmate made me come in. I thought it was just a cold.'"
    ),
    chunk("leila-hassan", "pneumonia", "hpc_narrative",
        "Leila started feeling unwell six days ago with a sore throat and fatigue — she attributed it to "
        "exam stress and lack of sleep. Four days ago she developed a cough that quickly became productive "
        "with yellow-green sputum. She developed a fever (flatmate measured 38.3°C). Two days ago she "
        "developed sharp left-sided chest pain, worse on deep inspiration — 'it really catches and I can't "
        "take a proper breath.' She has become progressively more breathless, which she initially blamed on "
        "her asthma — but her Salbutamol inhaler has not helped as it usually does, which worried her. Her "
        "flatmate, who is a nursing student, thought it looked like pneumonia and drove her in this morning."
    ),
    chunk("leila-hassan", "pneumonia", "symptom_breakdown_socrates",
        "Cough — Onset: 4 days ago; started dry then became productive within 24 hours. "
        "Character: productive, yellow-green sputum, small-moderate volume. "
        "Associations: left-sided pleuritic chest pain, fever, one rigor, breathlessness, severe fatigue. "
        "Time course: continuous, worsening progressively. "
        "Exacerbating: deep breathing worsens chest pain; lying flat worsens breathlessness; any exertion. "
        "Relieving: Paracetamol partially helps fever; lying on left side (splinting) marginally reduces pain. "
        "Severity: 6/10 overall; pleuritic pain is 7/10."
    ),
    chunk("leila-hassan", "pneumonia", "associated_symptoms",
        "Leila has a fever of 38.3°C. She has left-sided pleuritic chest pain — sharp, worse on deep "
        "inspiration and coughing. She had one rigor last night — 'I couldn't stop shaking for about ten "
        "minutes, it was really scary.' She has progressive breathlessness that is different from her asthma: "
        "'It doesn't wheeze like my asthma — it just feels like I can't get enough air.' She has severe "
        "fatigue and has been sleeping most of the day. She has barely eaten for two days."
    ),
    chunk("leila-hassan", "pneumonia", "pertinent_negatives",
        "Leila specifically denies wheeze — important distinction from an asthma exacerbation. Her Salbutamol "
        "inhaler has not helped, which she notes is unusual. She denies haemoptysis. She has no ankle swelling. "
        "She has no rash. She has no neck stiffness or photophobia. She has not recently travelled. She has "
        "no TB contacts. She has taken no new medications."
    ),
    chunk("leila-hassan", "pneumonia", "past_medical_history",
        "Childhood asthma diagnosed at age 5. One A&E visit at age 12 for a severe asthma attack. Eczema "
        "since infancy (mild). Allergic rhinitis. No immunodeficiency or recurrent serious infections. "
        "Her asthma is an important comorbidity — it can complicate the course of pneumonia."
    ),
    chunk("leila-hassan", "pneumonia", "past_surgical_history",
        "No surgical history. No prior hospital admissions beyond her A&E visit at age 12."
    ),
    chunk("leila-hassan", "pneumonia", "medications_and_adherence",
        "Salbutamol 100mcg PRN inhaler — using it but it is not helping with current breathlessness (which "
        "is different from her usual asthma). Clenil Modulite 100mcg BD preventer — often forgets. "
        "Paracetamol 500mg PRN — taking for fever. No antibiotics started."
    ),
    chunk("leila-hassan", "pneumonia", "allergies",
        "House dust mite allergy (asthma/rhinitis trigger). Mild peanut allergy (oral tingling, lip "
        "swelling — never required adrenaline). No drug allergies known."
    ),
    chunk("leila-hassan", "pneumonia", "family_history",
        "Mother has asthma. Father has hayfever. No family history of immunodeficiency, TB, or recurrent "
        "serious infections."
    ),
    chunk("leila-hassan", "pneumonia", "social_history",
        "Non-smoker, no alcohol. First-year university student under high academic stress (exams approaching). "
        "Lives in student halls — communal bathrooms and shared kitchen with many people, increasing exposure "
        "to respiratory pathogens. Poor nutrition during exam period. Not vaccinated against influenza this year. "
        "Fatigue and poor sleep are additional immune-compromising factors."
    ),
    chunk("leila-hassan", "pneumonia", "risk_factors",
        "Living in student halls (communal living increases exposure to respiratory pathogens). Underlying "
        "asthma increases susceptibility to respiratory infections and complicates recovery — airway "
        "inflammation may predispose to secondary bacterial infection. Academic stress and sleep deprivation "
        "impair immune function. Poor nutrition during exam period. No influenza vaccination this year. "
        "Young and otherwise healthy with no immunosuppression."
    ),
    chunk("leila-hassan", "pneumonia", "ice",
        "Ideas: Leila's flatmate told her it might be pneumonia, and she has looked it up on her phone. She "
        "is not sure: 'I don't know — maybe it's just a really bad cold?' "
        "Concerns: She is very worried about her upcoming exams — she cannot afford to fall further behind. "
        "She is scared of being admitted to hospital. She is worried about whether antibiotics interact with "
        "her asthma inhalers — 'Is it safe with my inhalers?' She will apologise for every question. "
        "Expectations: She hopes to be given antibiotics and told she can stay at home to recover. She wants "
        "to know if she needs to inform her university. She will ask multiple careful questions."
    ),
    chunk("leila-hassan", "pneumonia", "functional_impact",
        "Leila has been in bed for four days. She has missed a full week of lectures and is very anxious "
        "about falling behind. She is too breathless to walk to the communal bathroom without pausing to "
        "rest. Her flatmate has been bringing her food and water. She cannot study. She feels guilty about "
        "everything — missing lectures, being ill, needing help."
    ),
    chunk("leila-hassan", "pneumonia", "vitals",
        "On presentation: BP 106/68 mmHg (mildly low — dehydration from fever and poor oral intake), "
        "HR 112 bpm (tachycardic), RR 26 breaths/min (elevated), temperature 38.6°C (fever), "
        "SpO₂ 91% on room air (reduced, concerning in context of asthma). Appears flushed and unwell, "
        "mildly distressed. Dullness to percussion at left base. Bronchial breathing and crackles at left "
        "lower zone. No wheeze — important negative finding distinguishing this from an asthma attack."
    ),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def embed_text(client: httpx.AsyncClient, text: str) -> list[float] | None:
    try:
        r = await client.post(
            f"{OLLAMA_BASE}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json().get("embedding")
    except Exception as e:
        print(f"  [embed error] {e}")
        return None


async def upsert_chunk(
    client: httpx.AsyncClient,
    patient_id: str,
    chunk_text: str,
    embedding: list[float],
    metadata: dict,
) -> bool:
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    payload = {
        "patient_id": patient_id,
        "chunk_text": chunk_text,
        "embedding": embedding,
        "metadata": metadata,
    }
    try:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/patient_documents",
            headers=headers,
            json=payload,
            timeout=15.0,
        )
        r.raise_for_status()
        return True
    except Exception as e:
        print(f"  [upsert error] {e}")
        if hasattr(e, "response"):
            print(f"  Response: {e.response.text}")
        return False


async def clear_patient(client: httpx.AsyncClient, patient_id: str) -> None:
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    try:
        r = await client.delete(
            f"{SUPABASE_URL}/rest/v1/patient_documents?patient_id=eq.{patient_id}",
            headers=headers,
            timeout=15.0,
        )
        r.raise_for_status()
    except Exception as e:
        print(f"  [clear error] {e}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars before running.")
        sys.exit(1)

    async with httpx.AsyncClient() as probe:
        try:
            r = await probe.get(f"{OLLAMA_BASE}/api/tags", timeout=5.0)
            r.raise_for_status()
            models = [m["name"] for m in r.json().get("models", [])]
            if not any(EMBED_MODEL in m for m in models):
                print(f"WARNING: '{EMBED_MODEL}' not found in Ollama. Available: {models}")
                print(f"Run: ollama pull {EMBED_MODEL}")
                sys.exit(1)
            print(f"Ollama OK. Using model: {EMBED_MODEL}")
        except Exception as e:
            print(f"ERROR: Cannot reach Ollama at {OLLAMA_BASE} — {e}")
            sys.exit(1)

    by_patient: dict[str, list[dict]] = {}
    for doc in PATIENT_DOCUMENTS:
        pid = doc["patient_id"]
        by_patient.setdefault(pid, []).append(doc)

    total = len(PATIENT_DOCUMENTS)
    combos = len(by_patient)
    print(f"\nIndexing {total} chunks across {combos} patient-case combinations...\n")

    async with httpx.AsyncClient() as client:
        for patient_id, docs in by_patient.items():
            print(f"Combination: {patient_id}")
            print(f"  Clearing old chunks...")
            await clear_patient(client, patient_id)

            for i, doc in enumerate(docs):
                section = doc["metadata"].get("section", f"chunk_{i}")
                print(f"  [{i+1}/{len(docs)}] Embedding '{section}'...", end=" ", flush=True)
                embedding = await embed_text(client, doc["text"])
                if embedding is None:
                    print("FAILED (embedding error) — skipping")
                    continue
                ok = await upsert_chunk(
                    client,
                    patient_id=patient_id,
                    chunk_text=doc["text"],
                    embedding=embedding,
                    metadata=doc["metadata"],
                )
                print("OK" if ok else "FAILED (upsert error)")

            print()

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
