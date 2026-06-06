import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X,
    Send,
    Mic,
    MicOff,
    Brain,
    MessageCircle,
    Stethoscope,
    FileText,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Activity,
    Thermometer,
    Heart,
    User,
    Scale,
    Volume2,
    VolumeX,
    AlertTriangle,
    Clock,
    Wind,
    Play,
    Eye,
    Hand,
    Circle,
    Square,
    ListChecks,
    Shuffle,
    ArrowLeft,
    Search,
    RotateCcw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { selectPatientForCase } from '../../data/patients';
import { useAuth } from '../../context/AuthContext';
import {
    getPatientReplyApiUrl,
    getSttApiUrl,
    isFasterWhisperSttEnabled,
    primeAudioContext,
    recordAudioForStt,
    sendAudioToSttApi,
} from '../../lib/sttFasterWhisper';
import { upsertHistoryEvaluation, upsertPhysicalEvaluation } from '../../lib/historyEvaluations';
import { PhysicalExamChat } from './PhysicalExamChat';
import {
    syncHistoryScoreFromEvaluation,
    syncPhysicalScoreFromEvaluation,
    recomputeSessionTotalScore,
} from '../../lib/sessionScores';

const STEPS = [
    { id: 0, label: 'Case Selection', icon: Brain },
    { id: 1, label: 'History Taking', icon: MessageCircle },
    { id: 2, label: 'History Evaluation', icon: CheckCircle2 },
    { id: 3, label: 'Physical Exam', icon: Stethoscope },
    { id: 4, label: 'Physical Evaluation', icon: ListChecks }
];

const TITLE_TO_MOCK_KEY = {
    'Pneumonia': 'pneumonia',
    'Aortic Stenosis': 'aortic-stenosis',
    'Mitral Stenosis': 'mitral-stenosis',
    'Asthma': 'asthma',
    'COPD': 'copd',
    'Acute Myocardial Infarction': 'aortic-stenosis',
    'Pediatric Asthma Attack': 'asthma'
};

const INITIAL_VITALS = {
    age: '45 years',
    weight: '78 kg',
    temperature: '37.8°C',
    heartRate: '88 bpm',
    spO2: 97,
    respiratoryRate: 18
};

const SEVERITY_BY_MOCK_KEY = {
    'pneumonia': 'Moderate',
    'asthma': 'Mild',
    'copd': 'Moderate',
    'aortic-stenosis': 'Severe',
    'mitral-stenosis': 'Moderate'
};

const CHIEF_COMPLAINTS = {
    'pneumonia': "I have had fever and productive cough for the past 3 days.",
    'asthma': "I feel chest tightness and wheezing, especially at night.",
    'copd': "I have chronic cough and increasing shortness of breath.",
    'aortic-stenosis': "I feel dizzy and short of breath when I exert myself.",
    'mitral-stenosis': "I get tired easily and feel breathless when lying down."
};

const CASE_SYMPTOMS = {
    'pneumonia': ['Cough', 'Fever', 'Pleuritic chest pain', 'Shortness of breath', 'Fatigue', 'Yellow sputum'],
    'aortic-stenosis': ['Exertional dyspnea', 'Fatigue', 'Chest pain', 'Dizziness', 'Syncope'],
    'mitral-stenosis': ['Exertional dyspnea', 'Fatigue', 'Palpitations', 'Hemoptysis', 'Chest discomfort'],
    'asthma': ['Wheeze', 'Dyspnea', 'Chest tightness', 'Cough', 'Nocturnal symptoms'],
    'copd': ['Wheeze', 'Chronic cough', 'Dyspnea', 'Chest tightness', 'Sputum production', 'Fatigue']
};

/* ── Dashboard-matched palette ── */
const P = {
    card:     'hsl(var(--card))',
    border:   'rgba(255,255,255,0.07)',
    text:     '#f4f4f5',
    muted:    '#71717a',
    tag:      'rgba(255,255,255,0.06)',
    tagText:  '#a1a1aa',
    accent:   '#6ee7b7',
    accentBg: 'rgba(110,231,183,0.12)',
};

/* ── System category config ── */
const SYSTEM_CONFIG = {
    Cardiac:          { icon: Heart,      bg: 'rgba(239,68,68,0.12)',    color: '#f87171' },
    Cardiology:       { icon: Heart,      bg: 'rgba(239,68,68,0.12)',    color: '#f87171' },
    Respiratory:      { icon: Wind,       bg: 'rgba(59,130,246,0.12)',   color: '#60a5fa' },
    Pulmonology:      { icon: Wind,       bg: 'rgba(59,130,246,0.12)',   color: '#60a5fa' },
    Neurology:        { icon: Brain,      bg: 'rgba(168,85,247,0.12)',   color: '#c084fc' },
    Gastroenterology: { icon: Activity,   bg: 'rgba(245,158,11,0.12)',   color: '#fbbf24' },
    Pediatrics:       { icon: User,       bg: 'rgba(16,185,129,0.12)',   color: '#34d399' },
};
const DEFAULT_SYS = { icon: Stethoscope, bg: 'rgba(110,231,183,0.1)', color: '#6ee7b7' };

const CASE_PATIENT_REPLIES = {
    'pneumonia': [
        "It hurts when I breathe deeply, like a stabbing pain.",
        "The cough started about three days ago.",
        "Yes, I've had a low-grade fever since yesterday.",
        "It's yellowish-green, sometimes with a bit of blood."
    ],
    'aortic-stenosis': [
        "Yes, I feel lightheaded when I get up quickly.",
        "I get a squeezing feeling in my chest when I exert myself.",
        "I nearly passed out last week while walking.",
        "I can barely climb one flight without stopping."
    ],
    'mitral-stenosis': [
        "Sometimes my heart feels like it's fluttering.",
        "Yes, I've noticed some pink-tinged mucus.",
        "I get exhausted doing simple tasks.",
        "I need to sleep propped up on pillows now."
    ],
    'asthma': [
        "Cold air and dust seem to make it worse.",
        "Yes, I often wake up wheezing at 3 or 4 AM.",
        "It feels like someone is squeezing my chest.",
        "I'm allergic to cats and pollen."
    ],
    'copd': [
        "I've had this cough for years, but it's gotten worse.",
        "I smoked for 30 years, quit five years ago.",
        "Yes, I cough up thick mucus every morning.",
        "Maybe 50 meters before I need to rest."
    ]
};

const BODY_ZONES = [
    { id: 'chest-left', label: 'Chest Left', type: 'lung', position: { top: '28%', left: '35%' } },
    { id: 'chest-right', label: 'Chest Right', type: 'lung', position: { top: '28%', left: '55%' } },
    { id: 'upper-back-left', label: 'Upper Back Left', type: 'lung', position: { top: '22%', left: '28%' } },
    { id: 'upper-back-right', label: 'Upper Back Right', type: 'lung', position: { top: '22%', left: '62%' } },
    { id: 'lower-back-left', label: 'Lower Back Left', type: 'lung', position: { top: '38%', left: '28%' } },
    { id: 'lower-back-right', label: 'Lower Back Right', type: 'lung', position: { top: '38%', left: '62%' } },
    { id: 'heart-aortic', label: 'Heart (Aortic)', type: 'cardiac', position: { top: '30%', left: '42%' } },
    { id: 'heart-mitral', label: 'Heart (Mitral)', type: 'cardiac', position: { top: '36%', left: '48%' } }
];

const ZONE_FINDINGS = {
    'pneumonia': {
        lung: 'Crackles and decreased breath sounds',
        cardiac: 'Normal heart sounds, tachycardia'
    },
    'asthma': {
        lung: 'Diffuse wheezing on expiration',
        cardiac: 'Normal heart sounds'
    },
    'copd': {
        lung: 'Prolonged expiration with diffuse wheeze, decreased breath sounds',
        cardiac: 'Distant heart sounds'
    },
    'aortic-stenosis': {
        lung: 'Clear breath sounds',
        cardiac: 'Harsh systolic murmur radiating to carotids, crescendo-decrescendo'
    },
    'mitral-stenosis': {
        lung: 'Bibasilar crackles',
        cardiac: 'Diastolic rumble with opening snap at apex'
    }
};

const EXAM_CHECKLIST_ITEMS = [
    { id: 'inspection', label: 'Inspection', icon: Eye },
    { id: 'palpation', label: 'Palpation', icon: Hand },
    { id: 'percussion', label: 'Percussion', icon: Circle },
    { id: 'auscultation', label: 'Auscultation', icon: Stethoscope }
];

const REQUIRED_ZONES_BY_CASE = {
    'pneumonia': {
        zones: ['chest-left', 'chest-right', 'upper-back-left', 'upper-back-right'],
        label: 'Lung zones (front + back)',
        minRequired: 4
    },
    'asthma': {
        zones: ['chest-left', 'chest-right', 'upper-back-left', 'upper-back-right'],
        label: 'Lung zones (front + back)',
        minRequired: 4
    },
    'copd': {
        zones: ['chest-left', 'chest-right', 'lower-back-left', 'lower-back-right'],
        label: 'Lung zones (front + back)',
        minRequired: 4
    },
    'aortic-stenosis': {
        zones: ['heart-aortic', 'chest-left', 'chest-right'],
        label: 'Aortic area + chest',
        minRequired: 2
    },
    'mitral-stenosis': {
        zones: ['heart-mitral', 'chest-left', 'chest-right'],
        label: 'Mitral area + chest',
        minRequired: 2
    }
};

const PHYSICAL_RUBRIC_CRITERIA = [
    { key: 'technique', label: 'Technique' },
    { key: 'coverage', label: 'Coverage' },
    { key: 'infectionControl', label: 'Infection Control' },
    { key: 'interpretation', label: 'Interpretation' },
    { key: 'communication', label: 'Communication' }
];

function StudentPracticeFlow({ onExit, standaloneHistoryOnly = false, assignedSession = null }) {
    const { user, role } = useAuth();

    const isAssignedExam = Boolean(
        assignedSession?.sessionId && assignedSession?.sessionType === 'exam'
    );

    const skipCaseSelection = standaloneHistoryOnly || isAssignedExam;

    const [currentStep, setCurrentStep] = useState(skipCaseSelection ? 1 : 0);
    const [selectedCase, setSelectedCase] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [revealedSymptoms, setRevealedSymptoms] = useState([]);
    const [conversationSummary, setConversationSummary] = useState('');
    const patientTurnCount = useRef(0);
    const [casesFromDb, setCasesFromDb] = useState([]);
    const [casesLoading, setCasesLoading] = useState(true);
    const [casesError, setCasesError] = useState(null);
    const [messages, setMessages] = useState([
        {
            role: 'system',
            content: 'You are now with the patient. Begin by introducing yourself and asking about their symptoms.'
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [caseSelected, setCaseSelected] = useState(false);
    const [isRandomCase, setIsRandomCase] = useState(false);
    /** Practice + random case: student may reveal the case name once (offered at history & physical eval). */
    const [practiceCaseNameRevealed, setPracticeCaseNameRevealed] = useState(false);
    const hideCaseIdentity = isAssignedExam || (isRandomCase && !practiceCaseNameRevealed);
    const canOfferCaseReveal = isRandomCase && !isAssignedExam && !practiceCaseNameRevealed;
    /** Exam only: null = prompt, 'show' = full history eval + PDF, 'skip' = defer evaluation */
    const [selectedSystem, setSelectedSystem] = useState(null);
    const [caseSearch, setCaseSearch] = useState('');
    const [patientStatus, setPatientStatus] = useState(INITIAL_VITALS);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    /** Voice STT finished — user can edit textarea before Send */
    const [sttReviewReady, setSttReviewReady] = useState(false);
    const micLevelBarRef = useRef(null);
    const micLevelLabelRef = useRef(null);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [lastTranscript, setLastTranscript] = useState('');
    /** Last patient reply provider: groq | ollama | canned (from /patient-reply) */
    const [lastReplySource, setLastReplySource] = useState(null);
    
    // Evaluation step states
    const [selectedDiagnosis, setSelectedDiagnosis] = useState('');
    const [diagnosisConfidence, setDiagnosisConfidence] = useState(50);
    const [diagnosisRationale, setDiagnosisRationale] = useState('');
    const [showMissedQuestions, setShowMissedQuestions] = useState(false);
    const [showMissedPhysicalItems, setShowMissedPhysicalItems] = useState(false);
    const [copiedToClipboard, setCopiedToClipboard] = useState(false);
    const [copiedPhysicalToClipboard, setCopiedPhysicalToClipboard] = useState(false);
    // AI scoring state
    const [historyEvalLoading, setHistoryEvalLoading] = useState(false);
    const [historyEvalResult, setHistoryEvalResult] = useState(null);
    const [historyEvalError, setHistoryEvalError] = useState(null);
    const [historyEvalSaveError, setHistoryEvalSaveError] = useState(null);
    const [historyEvalSaved, setHistoryEvalSaved] = useState(false);
    const historyEvalDoneRef = useRef(false);
    const [physicalEvalLoading, setPhysicalEvalLoading] = useState(false);
    const [physicalEvalResult, setPhysicalEvalResult] = useState(null);
    const [physicalEvalError, setPhysicalEvalError] = useState(null);
    const [physicalEvalSaveError, setPhysicalEvalSaveError] = useState(null);
    const [physicalEvalSaved, setPhysicalEvalSaved] = useState(false);
    const physicalEvalDoneRef = useRef(false);
    
    // Physical Exam step states
    const [physicalExamMessages, setPhysicalExamMessages] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [selectedFinding, setSelectedFinding] = useState('');
    const [examLog, setExamLog] = useState([]);
    const [examChecklist, setExamChecklist] = useState({
        inspection: false,
        palpation: false,
        percussion: false,
        auscultation: false
    });
    const [playingSoundDemo, setPlayingSoundDemo] = useState(false);
    const [hasDeteriorated, setHasDeteriorated] = useState(false);
    const [isDeteriorating, setIsDeteriorating] = useState(false);
    const [redFlagRecognized, setRedFlagRecognized] = useState(false);
    
    // Completion screen states
    const [showCompletionScreen, setShowCompletionScreen] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [isSavingSession, setIsSavingSession] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [sessionStartedAt] = useState(() => new Date().toISOString());

    const chatEndRef = useRef(null);
    const countdownRef = useRef(null);
    const timerRef = useRef(null);
    const recognitionRef = useRef(null);
    const mockRecordingTimeoutRef = useRef(null);
    const fwRecordingRef = useRef(null);
    const chatInputRef = useRef(null);
    const sessionIdRef = useRef(null);
    const spacebarPTTRef = useRef(false);



    const fetchCases = useCallback(async () => {
        setCasesLoading(true);
        setCasesError(null);
        try {
            const { data, error } = await supabase
                .from('cases')
                .select('id, title, category');
            if (error) throw error;
            setCasesFromDb(data || []);
        } catch (err) {
            console.error('Failed to fetch cases:', err);
            setCasesError(err.message || 'Failed to load cases');
            setCasesFromDb([]);
        } finally {
            setCasesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCases();
    }, [fetchCases]);

    useEffect(() => {
        if (!isAssignedExam || !assignedSession?.sessionId) return;
        sessionIdRef.current = assignedSession.sessionId;
        if (casesFromDb.length === 0) return;
        const match =
            casesFromDb.find((c) => c.id === assignedSession.caseId) ||
            (assignedSession.caseTitle
                ? casesFromDb.find((c) => c.title === assignedSession.caseTitle)
                : null);
        if (match) {
            setSelectedCase(match);
            setCaseSelected(true);
            setIsRandomCase(false);
        }
    }, [isAssignedExam, assignedSession, casesFromDb]);

    useEffect(() => {
        if (standaloneHistoryOnly && casesFromDb.length > 0 && !selectedCase) {
            setSelectedCase(casesFromDb[0]);
        }
    }, [standaloneHistoryOnly, casesFromDb, selectedCase]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Reset session state when the case changes
    useEffect(() => {
        setRevealedSymptoms([]);
        setConversationSummary('');
        patientTurnCount.current = 0;
        setHistoryEvalResult(null);
        setHistoryEvalError(null);
        setHistoryEvalLoading(false);
        historyEvalDoneRef.current = false;
        setPhysicalExamMessages([]);
        setPhysicalEvalResult(null);
        setPhysicalEvalError(null);
        setPhysicalEvalLoading(false);
        setPhysicalEvalSaveError(null);
        setPhysicalEvalSaved(false);
        physicalEvalDoneRef.current = false;
        setPracticeCaseNameRevealed(false);
    }, [selectedCase]);

    // Assign persona when case is set (practice confirm, assigned exam, etc.)
    useEffect(() => {
        if (!selectedCase) return;
        const patient = selectPatientForCase(selectedCase);
        setSelectedPatient(patient);
        setPatientStatus({
            age: `${patient.age} years`,
            weight: `${patient.weight_kg} kg`,
            temperature: `${patient.vitals.temp}°C`,
            heartRate: `${patient.vitals.hr} bpm`,
            spO2: patient.vitals.spo2,
            respiratoryRate: patient.vitals.rr,
        });
    }, [selectedCase]);

    useEffect(() => {
        if (currentStep === 1) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [currentStep]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getCaseMockKey = useCallback((caseObj) => {
        if (!caseObj?.title) return 'pneumonia';
        return TITLE_TO_MOCK_KEY[caseObj.title] || 'pneumonia';
    }, []);

    const ensureSessionCreated = useCallback(async () => {
        if (assignedSession?.sessionId) return assignedSession.sessionId;
        if (sessionIdRef.current) return sessionIdRef.current;
        if (!user?.id) return null;
        const insertPayload = {
            station_id: null,
            case_id: selectedCase?.id || null,
            student_id: user.id,
            examiner_id: user.id,
            start_time: sessionStartedAt,
            end_time: null,
            status: 'In Progress',
            session_type: 'practice',
            score: null,
            feedback_notes: null
        };
        try {
            const { data: created, error } = await supabase
                .from('sessions')
                .insert([insertPayload])
                .select('id')
                .single();
            if (error) throw error;
            if (created?.id) {
                sessionIdRef.current = created.id;
                return created.id;
            }
        } catch (err) {
            const { session_type: _t, ...rest } = insertPayload;
            const { data: created, error } = await supabase
                .from('sessions')
                .insert([{ ...rest, type: 'practice' }])
                .select('id')
                .single();
            if (error) throw error;
            if (created?.id) {
                sessionIdRef.current = created.id;
                return created.id;
            }
        }
        return null;
    }, [user?.id, selectedCase?.id, sessionStartedAt, assignedSession?.sessionId]);

    const persistHistoryEvaluation = useCallback(
        async (result) => {
            if (!result?.sections) {
                setHistoryEvalSaveError('No checklist data to save.');
                return false;
            }
            if (!user?.id) {
                setHistoryEvalSaveError('Sign in to save your score.');
                return false;
            }
            const sessionId = await ensureSessionCreated();
            if (!sessionId) {
                setHistoryEvalSaveError('Could not link to a session record.');
                return false;
            }
            const { error } = await upsertHistoryEvaluation({
                sessionId,
                isExam: isAssignedExam,
                caseId: selectedCase?.id ?? null,
                checklistKey: getCaseMockKey(selectedCase),
                result,
            });
            if (error) {
                const msg = error.message || String(error);
                setHistoryEvalSaveError(
                    msg.includes('row-level security')
                        ? `${msg} — run supabase_migration_history_evaluations_fix.sql in Supabase.`
                        : msg
                );
                setHistoryEvalSaved(false);
                console.error('[history_evaluations]', error);
                return false;
            }
            setHistoryEvalSaveError(null);
            setHistoryEvalSaved(true);
            return true;
        },
        [user?.id, isAssignedExam, selectedCase, getCaseMockKey, ensureSessionCreated]
    );

    const runHistoryEvaluation = useCallback(() => {
        if (historyEvalDoneRef.current) return;
        const apiBase = getPatientReplyApiUrl();
        if (!apiBase) return;
        historyEvalDoneRef.current = true;
        setHistoryEvalLoading(true);
        setHistoryEvalError(null);
        const studentMsgs = messages.filter((m) => m.role === 'student');
        if (studentMsgs.length === 0) {
            setHistoryEvalLoading(false);
            return;
        }
        const caseKey = getCaseMockKey(selectedCase);
        fetch(`${apiBase}/evaluate-history-taking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation: messages,
                case_id: selectedCase?.id || caseKey,
                case_title: selectedCase?.title || '',
                patient_name: selectedPatient?.name || '',
                patient_id: selectedPatient?.id || '',
                chief_complaint: selectedCase?.chief_complaint || CHIEF_COMPLAINTS[caseKey] || '',
            }),
        })
            .then((r) => r.json())
            .then(async (data) => {
                if (data._error) setHistoryEvalError(`Scoring failed: ${data._error}`);
                setHistoryEvalResult(data);
                setHistoryEvalLoading(false);
                if (!data._error && data.sections) await persistHistoryEvaluation(data);
            })
            .catch((err) => {
                setHistoryEvalError(`Scoring service unavailable: ${err?.message || err}`);
                setHistoryEvalLoading(false);
            });
    }, [messages, selectedCase, selectedPatient, getCaseMockKey, persistHistoryEvaluation]);

    useEffect(() => {
        if (currentStep !== 2) return;
        if (historyEvalResult?.sections?.length) return;
        historyEvalDoneRef.current = false;
        runHistoryEvaluation();
    }, [currentStep, messages, runHistoryEvaluation, historyEvalResult]);

    const persistPhysicalEvaluation = useCallback(
        async (result) => {
            if (!result?.sections) {
                setPhysicalEvalSaveError('No checklist data to save.');
                return false;
            }
            if (!user?.id) {
                setPhysicalEvalSaveError('Sign in to save your score.');
                return false;
            }
            const sessionId = await ensureSessionCreated();
            if (!sessionId) {
                setPhysicalEvalSaveError('Could not link to a session record.');
                return false;
            }
            const { error } = await upsertPhysicalEvaluation({
                sessionId,
                isExam: isAssignedExam,
                caseId: selectedCase?.id ?? null,
                checklistKey: getCaseMockKey(selectedCase),
                result,
            });
            if (error) {
                const msg = error.message || String(error);
                setPhysicalEvalSaveError(
                    msg.includes('row-level security')
                        ? `${msg} — run supabase_migration_history_evaluations_fix.sql in Supabase.`
                        : msg
                );
                setPhysicalEvalSaved(false);
                console.error('[physical_evaluations]', error);
                return false;
            }
            setPhysicalEvalSaveError(null);
            setPhysicalEvalSaved(true);
            return true;
        },
        [user?.id, isAssignedExam, selectedCase, getCaseMockKey, ensureSessionCreated]
    );

    const runPhysicalEvaluation = useCallback((options = {}) => {
        const force = options?.force === true;
        if (physicalEvalDoneRef.current && !force) return;
        const apiBase = getPatientReplyApiUrl();
        if (!apiBase) {
            setPhysicalEvalError(
                'Scoring service not configured. Add VITE_PATIENT_REPLY_URL=http://localhost:8000 to .env.local and restart the dev server.'
            );
            setPhysicalEvalLoading(false);
            return;
        }
        const studentMsgs = physicalExamMessages.filter((m) => m.role === 'student');
        if (studentMsgs.length === 0 && examLog.length === 0) {
            setPhysicalEvalLoading(false);
            setPhysicalEvalError(null);
            return;
        }
        physicalEvalDoneRef.current = true;
        setPhysicalEvalLoading(true);
        setPhysicalEvalError(null);
        const caseKey = getCaseMockKey(selectedCase);
        fetch(`${apiBase}/evaluate-physical-examination`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation: physicalExamMessages,
                exam_log: examLog,
                case_id: selectedCase?.id || caseKey,
                case_title: selectedCase?.title || '',
                patient_name: selectedPatient?.name || '',
                patient_id: selectedPatient?.id || '',
            }),
        })
            .then(async (r) => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok) {
                    const detail = typeof data?.detail === 'string'
                        ? data.detail
                        : Array.isArray(data?.detail)
                            ? data.detail.map((d) => d?.msg || d).join(', ')
                            : r.statusText;
                    setPhysicalEvalError(`Scoring failed: ${detail || r.statusText}`);
                    setPhysicalEvalLoading(false);
                    physicalEvalDoneRef.current = false;
                    return;
                }
                if (data._error) setPhysicalEvalError(`Scoring failed: ${data._error}`);
                if (!data.sections?.length) {
                    setPhysicalEvalError((prev) => prev || 'Scoring returned no checklist. Is the Python server running on port 8000?');
                    setPhysicalEvalResult(null);
                    setPhysicalEvalLoading(false);
                    physicalEvalDoneRef.current = false;
                    return;
                }
                setPhysicalEvalResult(data);
                setPhysicalEvalLoading(false);
                if (!data._error && data.sections) await persistPhysicalEvaluation(data);
            })
            .catch((err) => {
                setPhysicalEvalError(`Scoring service unavailable: ${err?.message || err}`);
                setPhysicalEvalLoading(false);
                physicalEvalDoneRef.current = false;
            });
    }, [physicalExamMessages, examLog, selectedCase, selectedPatient, getCaseMockKey, persistPhysicalEvaluation]);

    useEffect(() => {
        if (currentStep !== 4) return;
        if (physicalEvalResult?.sections?.length) return;
        physicalEvalDoneRef.current = false;
        runPhysicalEvaluation();
    }, [currentStep, physicalExamMessages, examLog, runPhysicalEvaluation, physicalEvalResult]);

    // Create session early so history scores can be saved
    useEffect(() => {
        if (!user?.id || !caseSelected) return;
        if (currentStep < 1 || currentStep > 4) return;
        ensureSessionCreated().catch(() => {});
    }, [user?.id, caseSelected, currentStep, ensureSessionCreated]);

    const handleRandomAll = () => {
        if (casesFromDb.length === 0) return;
        const pick = casesFromDb[Math.floor(Math.random() * casesFromDb.length)];
        setSelectedCase(pick);
        setCaseSelected(true);
        setIsRandomCase(true);
    };

    const handleRandomFromSystem = () => {
        const pool = casesFromDb.filter(c => c.category === selectedSystem);
        if (pool.length === 0) return;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setSelectedCase(pick);
        setCaseSelected(true);
        setIsRandomCase(true);
    };

    const getPatientReply = useCallback(() => {
        const caseKey = getCaseMockKey(selectedCase);
        const replies = CASE_PATIENT_REPLIES[caseKey] || CASE_PATIENT_REPLIES['pneumonia'];
        return replies[Math.floor(Math.random() * replies.length)];
    }, [selectedCase, getCaseMockKey]);

    const fallbackSpeak = useCallback((text, gender) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            setIsSpeaking(false);
            return;
        }
        // Strip expressions like *coughs* before speaking
        const clean = text.replace(/\*[^*]+\*/g, '').replace(/\s+/g, ' ').trim();
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 0.9;
        utterance.pitch = gender === 'male' ? 0.85 : 1.05;
        utterance.volume = 1;

        const voices = window.speechSynthesis.getVoices();
        const en = voices.filter(v => v.lang.startsWith('en'));
        const isMale = gender === 'male';

        console.log('[TTS] available voices:', voices.map(v => v.name));

        const MALE_NAMES   = /\b(guy|davis|mark|david|ryan|eric|brandon|christopher|jacob|james|tony|richard|george|reed|steffan|adam|liam|noah|oliver)\b/i;
        const FEMALE_NAMES = /\b(aria|jenny|michelle|elizabeth|ana|zira|sabrina|sonia|neerja|leah|maisie|abbi|bella|hollie|libby|natasha|ava|emma|olivia)\b/i;

        const preferred =
            // 1. Named gender-specific match
            en.find(v => isMale ? MALE_NAMES.test(v.name) : FEMALE_NAMES.test(v.name)) ||
            // 2. Any "natural/neural/online" voice — still prefer gender via pitch
            en.find(v => /(natural|neural|online)/i.test(v.name)) ||
            // 3. en-US fallback
            en.find(v => v.lang === 'en-US') ||
            en[0] || voices[0];

        console.log('[TTS] selected voice:', preferred?.name, '| gender:', gender);
        if (preferred) utterance.voice = preferred;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    }, []);

    const getVoiceGender = useCallback((patient) => {
        const gender = (patient?.gender || selectedPatient?.gender || '').toLowerCase();
        return gender === 'male' ? 'male' : 'female';
    }, [selectedPatient]);


    const playTTS = useCallback((text, patient) => {
        const apiBase = getPatientReplyApiUrl();
        const gender = getVoiceGender(patient);
        const clean = text.replace(/\*[^*]+\*/g, '').replace(/\s+/g, ' ').trim();
        if (!clean) return;
        if (!apiBase) {
            fallbackSpeak(clean, gender);
            return;
        }
        const url = `${apiBase}/tts?text=${encodeURIComponent(clean)}&voice=${gender}`;
        const audio = new Audio(url);
        setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
            setIsSpeaking(false);
            fallbackSpeak(clean, gender);
        };
        audio.play().catch(() => {
            setIsSpeaking(false);
            fallbackSpeak(clean, gender);
        });
    }, [getVoiceGender, fallbackSpeak]);

    const handleSendMessage = useCallback(async (textOverride) => {
        const raw = typeof textOverride === 'string' ? textOverride : inputValue;
        const transcript = raw.trim();
        if (!transcript || isTyping) return;

        setSttReviewReady(false);
        setLastTranscript(transcript);

        const studentMessage = {
            role: 'student',
            content: transcript,
            ts: Date.now()
        };
        setMessages(prev => [...prev, studentMessage]);
        setInputValue('');
        setIsTyping(true);

        let patientResponse;
        let replySourceForMessage = null;
        const apiBase = getPatientReplyApiUrl();
        if (apiBase) {
            try {
                const caseKey = getCaseMockKey(selectedCase);
                const chiefComplaint =
                    selectedCase?.chief_complaint || CHIEF_COMPLAINTS[caseKey] || CHIEF_COMPLAINTS.pneumonia;
                const res = await fetch(`${apiBase}/patient-reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        // Case context
                        case_id: selectedCase?.id || '',
                        case_title: selectedCase?.title || '',
                        case_category: selectedCase?.category || '',
                        symptoms: CASE_SYMPTOMS[caseKey] || [],
                        chief_complaint: chiefComplaint,

                        // Patient identity — who the AI is playing
                        patient_id: selectedPatient?.id || '',
                        patient_name: selectedPatient?.name || 'Unknown Patient',
                        patient_age: Number(selectedPatient?.age) || 0,
                        patient_gender: selectedPatient?.gender || '',
                        patient_occupation: selectedPatient?.occupation || '',
                        patient_personality: selectedPatient?.personality || '',

                        // Medical background — grounding the AI's knowledge
                        past_medical_history: selectedPatient?.past_medical_history || '',
                        medications: selectedPatient?.medications || '',
                        allergies: selectedPatient?.allergies || '',
                        social_history: selectedPatient?.social_history || '',
                        family_history: selectedPatient?.family_history || '',

                        // LLM roleplay instruction
                        system_prompt: selectedPatient?.system_prompt || '',

                        // Conversation
                        student_question: transcript,
                        conversation_history: messages.slice(-10),
                        revealed_symptoms: revealedSymptoms,
                        conversation_summary: conversationSummary,
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data?.revealed_symptoms) {
                    setRevealedSymptoms(data.revealed_symptoms);
                }
                if (res.ok && data?.text) {
                    patientResponse = data.text;
                    const src = data.reply_source || res.headers.get('X-Reply-Source');
                    if (src) {
                        replySourceForMessage = src;
                        setLastReplySource(src);
                    }
                } else {
                    const detail = typeof data?.detail === 'string'
                        ? data.detail
                        : Array.isArray(data?.detail)
                            ? data.detail.map((d) => d?.msg || d).join(', ')
                            : res.statusText || 'Unknown error';
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: 'alert',
                            content: `AI patient unavailable (${res.status}): ${detail}. Check that the Python server is running on port 8000 and restart it after env changes.`,
                            ts: Date.now(),
                        },
                    ]);
                    setIsTyping(false);
                    return;
                }
            } catch (err) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'alert',
                        content: `Could not reach the AI server (${err?.message || err}). Start it with: cd server && .venv\\Scripts\\Activate.ps1 && python -m uvicorn main:app --reload --port 8000`,
                        ts: Date.now(),
                    },
                ]);
                setIsTyping(false);
                return;
            }
        } else {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'alert',
                    content: 'AI server URL not configured. Add VITE_PATIENT_REPLY_URL=http://localhost:8000 to .env.local and restart npm run dev.',
                    ts: Date.now(),
                },
            ]);
            setIsTyping(false);
            return;
        }

        // Strip *expressions* from displayed text — they're for TTS only
        const displayText = patientResponse.replace(/\*[^*]+\*/g, '').replace(/\s+/g, ' ').trim();

        // Show text immediately
        const updatedMessages = [...messages, studentMessage, { role: 'patient', content: displayText, ts: Date.now() }];
        setMessages(prev => [...prev, {
            role: 'patient',
            content: displayText,
            ts: Date.now(),
            reply_source: replySourceForMessage,
        }]);

        // Rolling summary — fire every 6 patient turns in the background
        patientTurnCount.current += 1;
        if (patientTurnCount.current % 6 === 0 && apiBase) {
            const caseKey = getCaseMockKey(selectedCase);
            fetch(`${apiBase}/summarise-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversation_history: updatedMessages,
                    patient_name: selectedPatient?.name || '',
                    case_title: isAssignedExam ? '' : (selectedCase?.title || ''),
                    symptoms: CASE_SYMPTOMS[caseKey] || [],
                    prior_summary: conversationSummary,
                    patient_id: selectedPatient?.id || '',
                }),
            })
                .then(r => r.json())
                .then(d => { if (d?.summary) setConversationSummary(d.summary); })
                .catch(() => {});
        }
        setIsTyping(false);

        if (voiceEnabled) {
            window.speechSynthesis.cancel();
            playTTS(patientResponse, selectedPatient);
        }
    }, [inputValue, isTyping, getPatientReply, playTTS, voiceEnabled, selectedCase, selectedPatient, messages, getCaseMockKey, revealedSymptoms, conversationSummary]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    const getMockTranscript = useCallback(() => {
        const caseKey = getCaseMockKey(selectedCase);
        const mockTranscripts = {
            'pneumonia': ["Can you describe your chest pain?", "When did your cough start?", "Do you have any fever?"],
            'aortic-stenosis': ["Do you feel dizzy when standing?", "Does your chest hurt during exercise?", "Have you fainted recently?"],
            'mitral-stenosis': ["Do you feel your heart racing?", "Have you coughed up any blood?", "Do you get tired easily?"],
            'asthma': ["What triggers your breathing problems?", "Do you wheeze at night?", "Does your chest feel tight?"],
            'copd': ["How long have you been coughing?", "Do you smoke or have you smoked?", "Do you produce sputum when coughing?"]
        };
        const transcripts = mockTranscripts[caseKey] || mockTranscripts['pneumonia'];
        return transcripts[Math.floor(Math.random() * transcripts.length)];
    }, [selectedCase, getCaseMockKey]);

    const reportSttIssue = useCallback((message, error = null) => {
        if (error) console.error('[STT]', error);
        const detail = error?.message ? ` ${error.message}` : '';
        const content = `${message}${detail}`.trim();
        setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'alert' && last.content === content) return prev;
            return [...prev, { role: 'alert', content, ts: Date.now() }];
        });
    }, []);

    const stopMicLevelMonitor = useCallback(() => {
        if (micLevelBarRef.current) micLevelBarRef.current.style.width = '0%';
        if (micLevelLabelRef.current) micLevelLabelRef.current.textContent = '';
    }, []);

    const applySttTranscript = useCallback((text, { autoSend = false } = {}) => {
        const transcript = typeof text === 'string' ? text.trim() : '';
        setInputValue(transcript);
        if (!transcript) {
            setSttReviewReady(false);
            reportSttIssue('No speech was detected. Please try again and speak clearly.');
            return;
        }
        if (autoSend) {
            handleSendMessage(transcript);
        } else {
            setSttReviewReady(true);
        }
    }, [reportSttIssue, handleSendMessage]);

    // Focus textarea after voice transcription for review/edit
    useEffect(() => {
        if (!isTranscribing && sttReviewReady && chatInputRef.current) {
            chatInputRef.current.focus();
            const len = chatInputRef.current.value.length;
            chatInputRef.current.setSelectionRange(len, len);
        }
    }, [isTranscribing, sttReviewReady]);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            // Stopping: either Faster-Whisper recording or browser SpeechRecognition
            if (fwRecordingRef.current) {
                const controller = fwRecordingRef.current;
                fwRecordingRef.current = null;
                stopMicLevelMonitor();
                setIsRecording(false);
                setIsTranscribing(true);
                controller.stop()
                    .then((blob) => sendAudioToSttApi(blob))
                    .then(({ text }) => {
                        applySttTranscript(text);
                        setIsTranscribing(false);
                    })
                    .catch((error) => {
                        reportSttIssue('Speech transcription failed.', error);
                        setIsTranscribing(false);
                    });
                return;
            }
            setIsRecording(false);
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch {}
            }
            if (mockRecordingTimeoutRef.current) {
                clearTimeout(mockRecordingTimeoutRef.current);
            }
            return;
        }

        if (sttReviewReady) setInputValue('');
        setSttReviewReady(false);

        // Starting: prefer Faster-Whisper STT when API URL is set
        if (isFasterWhisperSttEnabled()) {
            primeAudioContext();
            const onLevel = (level, meta) => {
                if (micLevelBarRef.current) {
                    micLevelBarRef.current.style.width = `${level}%`;
                    micLevelBarRef.current.style.background =
                        level > 60 ? 'linear-gradient(90deg,#6ee7b7,#3b82f6)' :
                        level > 20 ? '#6ee7b7' : 'rgba(255,255,255,0.2)';
                }
                if (micLevelLabelRef.current) {
                    const device = meta?.deviceLabel ? ` · ${meta.deviceLabel}` : '';
                    micLevelLabelRef.current.textContent =
                        level < 3
                            ? `No signal — check mic${device}`
                            : level < 20
                                ? `Low${device}`
                                : level < 60
                                    ? `Good${device}`
                                    : `Strong${device}`;
                }
            };
            const controller = recordAudioForStt(onLevel);
            controller.start()
                .then(() => {
                    fwRecordingRef.current = controller;
                    setIsRecording(true);
                })
                .catch((error) => {
                    fwRecordingRef.current = null;
                    stopMicLevelMonitor();
                    setIsRecording(false);
                    reportSttIssue('Microphone access failed.', error);
                });
            return;
        }

        // Fallback: browser Web Speech API
        setIsRecording(true);
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            try {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    applySttTranscript(transcript);
                    setIsRecording(false);
                };

                recognitionRef.current.onerror = () => {
                    applySttTranscript(getMockTranscript());
                    setIsRecording(false);
                };

                recognitionRef.current.onend = () => {
                    setIsRecording(false);
                };

                recognitionRef.current.start();
            } catch {
                mockRecordingTimeoutRef.current = setTimeout(() => {
                    applySttTranscript(getMockTranscript());
                    setIsRecording(false);
                }, 1500);
            }
        } else {
            mockRecordingTimeoutRef.current = setTimeout(() => {
                applySttTranscript(getMockTranscript());
                setIsRecording(false);
            }, 1500);
        }
    }, [isRecording, sttReviewReady, getMockTranscript, applySttTranscript, reportSttIssue, stopMicLevelMonitor]);

    const handleReRecord = useCallback(() => {
        setSttReviewReady(false);
        setInputValue('');
        if (isRecording || isTranscribing || isTyping || isSpeaking) return;
        toggleRecording();
    }, [isRecording, isTranscribing, isTyping, isSpeaking, toggleRecording]);

    // Spacebar push-to-talk: hold Space to record, release to stop (only when not typing in the input)
    useEffect(() => {
        if (currentStep !== 1) return;

        const onKeyDown = (e) => {
            if (e.code !== 'Space' || e.repeat) return;
            if (document.activeElement === chatInputRef.current) return;
            if (isRecording || isTranscribing || isTyping || isSpeaking) return;
            e.preventDefault();
            spacebarPTTRef.current = true;
            toggleRecording();
        };

        const onKeyUp = (e) => {
            if (e.code !== 'Space' || !spacebarPTTRef.current) return;
            e.preventDefault();
            spacebarPTTRef.current = false;
            if (isRecording) toggleRecording();
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
        };
    }, [currentStep, isRecording, isTranscribing, isTyping, isSpeaking, toggleRecording]);

    // Cleanup speech recognition, Faster-Whisper recording, and synthesis on unmount
    useEffect(() => {
        return () => {
            if (fwRecordingRef.current) {
                fwRecordingRef.current.stop().catch(() => {});
                fwRecordingRef.current = null;
            }
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch {}
            }
            if (mockRecordingTimeoutRef.current) {
                clearTimeout(mockRecordingTimeoutRef.current);
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            setIsSpeaking(false);
            setIsRecording(false);
        };
    }, []);

    // Cancel speech synthesis when voice is disabled
    useEffect(() => {
        if (!voiceEnabled && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [voiceEnabled]);

    // Completion screen countdown
    useEffect(() => {
        if (showCompletionScreen) {
            setCountdown(10);
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current);
                        onExit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        
        return () => {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, [showCompletionScreen, onExit]);

    // Compute history score — uses real AI eval result when available
    const computeHistoryScore = useCallback(() => {
        if (historyEvalResult?.items_covered != null && historyEvalResult?.total_items) {
            const base = (historyEvalResult.items_covered / historyEvalResult.total_items) * 8;
            const bonus = selectedDiagnosis === selectedCase?.id ? 2 : 0;
            return Math.min(10, Math.round((base + bonus) * 10) / 10);
        }
        // Fallback when scoring unavailable
        const aiRubricScores = { communication: 2, structure: 2, safety: 1, clinicalReasoning: 2, professionalism: 2 };
        const rubricTotal = Object.values(aiRubricScores).reduce((a, b) => a + b, 0);
        let score = 0;
        if (hasDeteriorated && redFlagRecognized) score += 1.5;
        if (selectedDiagnosis === selectedCase?.id) score += 1.5;
        score += (rubricTotal / 10) * 4.5;
        return Math.min(10, Math.round(score * 10) / 10);
    }, [historyEvalResult, hasDeteriorated, redFlagRecognized, selectedDiagnosis, selectedCase?.id]);

    // Compute physical score — uses real AI eval result when available
    const computePhysicalScore = useCallback(() => {
        if (physicalEvalResult?.items_covered != null && physicalEvalResult?.total_items) {
            return Math.min(
                10,
                Math.round((physicalEvalResult.items_covered / physicalEvalResult.total_items) * 10 * 10) / 10
            );
        }
        const caseKey = getCaseMockKey(selectedCase);
        const requirements = REQUIRED_ZONES_BY_CASE[caseKey] || REQUIRED_ZONES_BY_CASE['pneumonia'];
        const examinedZoneIds = examLog
            .map((entry) => {
                const zone = BODY_ZONES.find((z) => z.label === entry.zone);
                return zone?.id;
            })
            .filter(Boolean);
        const coveredRequiredZones = requirements.zones.filter((zoneId) => examinedZoneIds.includes(zoneId));
        const coverageComplete = coveredRequiredZones.length >= requirements.minRequired;
        const aiPhysicalRubric = {
            technique: 2,
            coverage: coverageComplete ? 2 : 1,
            infectionControl: 2,
            interpretation: 2,
            communication: 1
        };
        const physicalRubricTotal = Object.values(aiPhysicalRubric).reduce((a, b) => a + b, 0);
        const aiPhysicalChecklist = {
            inspection: true,
            palpation: true,
            percussion: false,
            auscultation: examinedZoneIds.length > 0
        };
        const physicalChecklistCompleted = Object.values(aiPhysicalChecklist).filter(Boolean).length;
        let score = 0;
        score += (coveredRequiredZones.length / requirements.zones.length) * 3;
        score += (physicalRubricTotal / 10) * 4.5;
        score += (physicalChecklistCompleted / 4) * 2.5;
        return Math.min(10, Math.round(score * 10) / 10);
    }, [physicalEvalResult, selectedCase, getCaseMockKey, examLog]);

    const handleFinishSession = async () => {
        if (isSavingSession) return;
        setIsSavingSession(true);
        setSaveError(null);

        try {
            // If we don't have an authenticated user (or can't identify one), we still allow the UX flow.
            if (!user?.id) {
                setShowCompletionScreen(true);
                return;
            }

            const historyScore = computeHistoryScore();
            const physicalScore = computePhysicalScore();

            const caseKey = getCaseMockKey(selectedCase);
            const requirements = REQUIRED_ZONES_BY_CASE[caseKey] || REQUIRED_ZONES_BY_CASE['pneumonia'];
            const examinedZoneIds = examLog
                .map((entry) => {
                    const zone = BODY_ZONES.find((z) => z.label === entry.zone);
                    return zone?.id;
                })
                .filter(Boolean);
            const coveredRequiredZones = requirements.zones.filter((zoneId) => examinedZoneIds.includes(zoneId));
            const coverageComplete = coveredRequiredZones.length >= requirements.minRequired;

            const historyFeedback = (() => {
                if (hasDeteriorated && !redFlagRecognized) {
                    return 'Important: You missed the SpO₂ deterioration. Always monitor vitals closely!';
                }
                if (historyScore >= 8) return 'Excellent history taking! You covered all key areas systematically.';
                if (historyScore >= 6) return 'Good history structure. Consider being more thorough with social history.';
                if (historyScore >= 4) return 'Adequate attempt. Remember to always check allergies and medications.';
                return 'Keep practicing. Try to cover all OSCE checklist items systematically.';
            })();

            const physicalFeedback = physicalEvalResult?.feedback || (() => {
                if (examLog.length === 0) {
                    return 'No physical examination was performed. Remember to examine relevant body zones.';
                }
                if (coverageComplete) {
                    return `Good coverage of ${requirements.label}. Systematic approach demonstrated.`;
                }
                return `Partial coverage. Remember to examine ${requirements.label} for this case.`;
            })();

            const nowIso = new Date().toISOString();
            const feedbackNotes = `History feedback: ${historyFeedback}\nPhysical feedback: ${physicalFeedback}`;

            // 1) Ensure same session_id for all scores (do NOT create new session_id)
            let sessionId = await ensureSessionCreated();
            if (!sessionId) sessionId = sessionIdRef.current;
            if (!sessionId) throw new Error('Failed to create or retrieve session row.');

            // 2) history_evaluations → session_scores.history_taking (via persist or fallback)
            if (historyEvalResult?.sections) {
                await persistHistoryEvaluation(historyEvalResult);
            } else {
                const historyPercent = historyEvalResult?.items_covered != null && historyEvalResult?.total_items
                    ? Math.round((historyEvalResult.items_covered / historyEvalResult.total_items) * 100)
                    : Math.round(historyScore * 10);
                await syncHistoryScoreFromEvaluation(sessionId, historyPercent);
            }

            // 3) Physical exam → session_scores.physical_examination
            if (physicalEvalResult?.sections) {
                await persistPhysicalEvaluation(physicalEvalResult);
            } else {
                const physicalPercent = physicalEvalResult?.items_covered != null && physicalEvalResult?.total_items
                    ? Math.round((physicalEvalResult.items_covered / physicalEvalResult.total_items) * 100)
                    : Math.round(physicalScore * 10);
                await syncPhysicalScoreFromEvaluation(sessionId, physicalPercent);
            }

            // 4) Sum history + physical (0–10 each) → sessions.score (0–100)
            const { sessionScore } = await recomputeSessionTotalScore(sessionId);

            // 5) Complete session row
            await supabase
                .from('sessions')
                .update({
                    end_time: nowIso,
                    score: sessionScore ?? Math.min(100, Math.round(((historyScore + physicalScore) / 20) * 100)),
                    status: 'Completed',
                    feedback_notes: feedbackNotes
                })
                .eq('id', sessionId);
        } catch (err) {
            console.error('Failed to persist session scores:', err);
            setSaveError(err?.message || 'Failed to save session scores');
        } finally {
            setIsSavingSession(false);
            setShowCompletionScreen(true);
        }
    };

    const handleReturnNow = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }
        onExit();
    }, [onExit]);

    // Physical Exam handlers
    const handleZoneClick = useCallback((zone) => {
        setSelectedZone(zone);
        
        const caseKey = getCaseMockKey(selectedCase);
        const findings = ZONE_FINDINGS[caseKey] || ZONE_FINDINGS['pneumonia'];
        const finding = findings[zone.type] || 'Normal findings';
        setSelectedFinding(finding);
        
        // Add to exam log
        const logEntry = {
            zone: zone.label,
            finding: finding,
            timestamp: Date.now()
        };
        setExamLog(prev => [logEntry, ...prev].slice(0, 10));
        
        // Auto-check auscultation when clicking zones
        setExamChecklist(prev => ({ ...prev, auscultation: true }));
    }, [selectedCase, getCaseMockKey]);

    const handlePlaySound = useCallback(() => {
        setPlayingSoundDemo(true);
        setTimeout(() => {
            setPlayingSoundDemo(false);
        }, 2000);
    }, []);

    const toggleExamChecklistItem = useCallback((itemId) => {
        setExamChecklist(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    }, []);

    const triggerAutoDeteriorationInternal = () => {
        if (hasDeteriorated) return;
        setHasDeteriorated(true);
        setIsDeteriorating(true);
        setPatientStatus(prev => ({
            ...prev,
            spO2: 88,
            respiratoryRate: 28,
            heartRate: '102 bpm'
        }));
        setMessages(prev => [...prev, {
            role: 'alert',
            content: 'Patient condition worsening! SpO₂ dropping rapidly.'
        }]);
    };

    const triggerDeterioration = () => {
        if (hasDeteriorated) return;
        triggerAutoDeteriorationInternal();
    };

    const goNext = async () => {
        if (currentStep === 2 && user?.id && historyEvalResult?.sections) {
            try {
                await persistHistoryEvaluation(historyEvalResult);
            } catch (err) {
                console.error('Failed to save history evaluation:', err);
            }
        }
        if (currentStep === 3) {
            physicalEvalDoneRef.current = false;
            setPhysicalEvalResult(null);
            setPhysicalEvalError(null);
            setPhysicalEvalLoading(false);
        }
        if (currentStep === 4 && user?.id && physicalEvalResult?.sections) {
            try {
                await persistPhysicalEvaluation(physicalEvalResult);
            } catch (err) {
                console.error('Failed to save physical evaluation:', err);
            }
        }
        if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
    };

    const goBack = () => {
        if (currentStep > 0) {
            if (currentStep === 2) {
                setHistoryEvalResult(null);
                setHistoryEvalError(null);
                setHistoryEvalLoading(false);
                historyEvalDoneRef.current = false;
            }
            if (currentStep === 4) {
                setPhysicalEvalResult(null);
                setPhysicalEvalError(null);
                setPhysicalEvalLoading(false);
                setPhysicalEvalSaveError(null);
                setPhysicalEvalSaved(false);
                physicalEvalDoneRef.current = false;
            }
            setCurrentStep(currentStep - 1);
        }
    };

    if (isAssignedExam && role === 'student') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background">
                <p className="text-lg font-semibold text-foreground">Exam run by your instructor</p>
                <p className="text-sm text-muted-foreground max-w-md">
                    OSCE exams are started from your instructor&apos;s Sessions page at the scheduled time.
                    Go to your exam station when they begin the session.
                </p>
                <button
                    type="button"
                    onClick={onExit}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    Back
                </button>
            </div>
        );
    }

    if (isAssignedExam && !selectedCase) {
        return (
            <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-4 px-6">
                {casesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading exam case…</p>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground text-center max-w-sm">
                            Could not load the assigned case. Check that the case still exists.
                        </p>
                        <button type="button" onClick={onExit} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground">
                            Back
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            <header className="bg-card border-b border-white/5 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Brain size={22} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">
                            {isAssignedExam ? 'OSCE Exam' : 'Practice Session'}
                        </h1>
                        {selectedCase && !hideCaseIdentity && (
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">
                                    {isRandomCase ? 'Case: Hidden' : `Case: ${selectedCase.title}`}
                                </p>
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                    selectedCase.category === 'Cardiac'
                                        ? "bg-red-500/10 text-red-400"
                                        : "bg-blue-500/10 text-blue-400"
                                )}>
                                    {selectedCase.category}
                                </span>
                            </div>
                        )}
                        {isAssignedExam && assignedSession?.studentName && (
                            <p className="text-sm font-semibold text-foreground mt-0.5">
                                {assignedSession.studentName}
                            </p>
                        )}
                        {isAssignedExam && (
                            <p className="text-xs text-muted-foreground">
                                OSCE exam candidate
                                {selectedPatient?.name ? ` · Patient: ${selectedPatient.name}` : ''}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={onExit}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                    <X size={20} />
                </button>
            </header>

            {/* Stepper */}
            <div className="flex-shrink-0 px-8 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Left: current step info */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: P.accentBg, color: P.accent, border: `1px solid rgba(110,231,183,0.25)` }}>
                        {currentStep + 1}
                    </div>
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: P.muted }}>Step {currentStep + 1} of {STEPS.length}</p>
                        <p className="text-sm font-semibold" style={{ color: P.text }}>{STEPS[currentStep].label}</p>
                    </div>
                </div>

                {/* Right: dot trail */}
                <div className="flex items-center gap-2">
                    {STEPS.map((step, index) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        return (
                            <div key={step.id} className="flex items-center gap-2">
                                <div
                                    className="rounded-full transition-all duration-300"
                                    style={{
                                        width: isActive ? 24 : 6,
                                        height: 6,
                                        background: isCompleted
                                            ? P.accent
                                            : isActive
                                                ? P.accent
                                                : 'rgba(255,255,255,0.12)',
                                        opacity: isActive ? 1 : isCompleted ? 0.7 : 0.4,
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {/* Step 0: Case Selection */}
                {!standaloneHistoryOnly && currentStep === 0 && (() => {
                    // Derive unique systems from fetched cases
                    const systems = Object.entries(
                        casesFromDb.reduce((acc, c) => {
                            acc[c.category] = (acc[c.category] || 0) + 1;
                            return acc;
                        }, {})
                    ).map(([name, count]) => ({ name, count, ...(SYSTEM_CONFIG[name] || DEFAULT_SYS) }));

                    return (
                        <div className="flex overflow-hidden" style={{ height: '100%' }}>

                            {/* ── Left: selection panel ── */}
                            <div className="w-[380px] flex-shrink-0 overflow-y-auto relative" style={{ borderRight: `1px solid ${P.border}` }}>
                                <div className="px-6 pt-8 pb-8">

                                    {/* ── Headline ── */}
                                    {!selectedSystem ? (
                                        <div className="mb-8">
                                            <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: P.muted }}>Practice Session</p>
                                            <h2 className="text-[28px] font-light leading-tight mb-1" style={{ color: P.text }}>
                                                What would you like
                                            </h2>
                                            <h2 className="text-[28px] font-semibold leading-tight" style={{ color: P.accent }}>
                                                to practise today?
                                            </h2>
                                        </div>
                                    ) : (
                                        <div className="mb-7">
                                            <button
                                                onClick={() => { setSelectedSystem(null); setSelectedCase(null); setCaseSelected(false); setCaseSearch(''); }}
                                                className="inline-flex items-center gap-1.5 text-xs mb-5 px-3 py-1.5 rounded-full transition-colors hover:bg-white/5"
                                                style={{ color: P.muted, border: `1px solid ${P.border}` }}
                                            >
                                                <ArrowLeft size={12} /> Back to systems
                                            </button>
                                            <h2 className="text-[26px] font-semibold leading-tight mb-1" style={{ color: P.text }}>{selectedSystem}</h2>
                                            <p className="text-sm" style={{ color: P.muted }}>Pick a case or get one assigned at random</p>
                                        </div>
                                    )}

                                    {/* ── States ── */}
                                    {casesLoading ? (
                                        <div className="flex items-center gap-3 py-10">
                                            <Activity size={15} className="animate-spin" style={{ color: P.accent }} />
                                            <span className="text-sm" style={{ color: P.muted }}>Loading cases...</span>
                                        </div>
                                    ) : casesError ? (
                                        <div className="space-y-3 py-8">
                                            <p className="text-sm text-red-400">{casesError}</p>
                                            <button onClick={fetchCases} className="text-sm font-medium underline underline-offset-2 hover:opacity-70" style={{ color: P.accent }}>Retry</button>
                                        </div>
                                    ) : casesFromDb.length === 0 ? (
                                        <p className="text-sm py-10" style={{ color: P.muted }}>No cases found.</p>

                                    ) : caseSelected ? (
                                        /* ── Confirmation ── */
                                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-300 space-y-3">
                                            <div className="rounded-3xl px-5 py-5" style={{ background: P.accentBg, border: `1px solid rgba(110,231,183,0.2)` }}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: P.accent }} />
                                                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: P.accent }}>Selected case</p>
                                                </div>
                                                <p className="text-[17px] font-semibold leading-snug mb-3" style={{ color: P.text }}>
                                                    {isRandomCase ? 'Random Case' : selectedCase.title}
                                                </p>
                                                <span className="inline-flex items-center text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.07)', color: P.tagText }}>
                                                    {selectedCase.category}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const patient = selectPatientForCase(selectedCase);
                                                    setSelectedPatient(patient);
                                                    setPatientStatus({
                                                        age: `${patient.age} years`,
                                                        weight: `${patient.weight_kg} kg`,
                                                        temperature: `${patient.vitals.temp}°C`,
                                                        heartRate: `${patient.vitals.hr} bpm`,
                                                        spO2: patient.vitals.spo2,
                                                        respiratoryRate: patient.vitals.rr,
                                                    });
                                                    setCurrentStep(1);
                                                }}
                                                className="w-full py-3.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                                                style={{ background: P.accent, color: '#0a0a0a', boxShadow: `0 4px 20px rgba(110,231,183,0.2)` }}
                                            >
                                                <Play size={13} fill="#0a0a0a" /> Begin Session
                                            </button>
                                            <button
                                                onClick={() => { setSelectedCase(null); setCaseSelected(false); }}
                                                className="w-full py-2.5 rounded-full text-sm font-medium transition-colors hover:bg-white/5"
                                                style={{ color: P.muted }}
                                            >
                                                Change case
                                            </button>
                                        </div>

                                    ) : !selectedSystem ? (
                                        /* ── System chips ── */
                                        <>
                                            <p className="text-xs font-medium mb-3" style={{ color: P.muted }}>Select a system</p>
                                            <div className="flex flex-wrap gap-2 mb-8">
                                                {systems.map(({ name, icon: Icon, bg, color }) => (
                                                    <button
                                                        key={name}
                                                        onClick={() => setSelectedSystem(name)}
                                                        className="flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all hover:brightness-110 active:scale-95"
                                                        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.09)`, color: P.text }}
                                                    >
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                                                            <Icon size={11} style={{ color }} />
                                                        </div>
                                                        {name}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="flex-1 h-px" style={{ background: P.border }} />
                                                <span className="text-xs" style={{ color: P.muted }}>or skip ahead</span>
                                                <div className="flex-1 h-px" style={{ background: P.border }} />
                                            </div>

                                            <button
                                                onClick={handleRandomAll}
                                                className="w-full py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2.5 transition-all hover:bg-white/5 active:scale-[0.98]"
                                                style={{ border: `1px solid rgba(110,231,183,0.25)`, color: P.accent }}
                                            >
                                                <Shuffle size={14} />
                                                Assign me a random case
                                            </button>
                                        </>

                                    ) : (
                                        /* ── Cases list ── */
                                        <>
                                            <button
                                                onClick={handleRandomFromSystem}
                                                className="w-full py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2.5 mb-5 transition-all hover:bg-white/5 active:scale-[0.98]"
                                                style={{ border: `1px solid rgba(110,231,183,0.25)`, color: P.accent }}
                                            >
                                                <Shuffle size={14} />
                                                Random {selectedSystem} case
                                            </button>

                                            {/* Search bar */}
                                            <div className="relative mb-5">
                                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: P.muted }} />
                                                <input
                                                    type="text"
                                                    placeholder="Search cases…"
                                                    value={caseSearch}
                                                    onChange={e => setCaseSearch(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2.5 rounded-full text-sm outline-none transition-all"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.04)',
                                                        border: `1px solid rgba(255,255,255,0.09)`,
                                                        color: P.text,
                                                        caretColor: P.accent,
                                                    }}
                                                    onFocus={e => e.target.style.border = `1px solid rgba(110,231,183,0.35)`}
                                                    onBlur={e => e.target.style.border = `1px solid rgba(255,255,255,0.09)`}
                                                />
                                            </div>

                                            {(() => {
                                                const filtered = casesFromDb
                                                    .filter(c => c.category === selectedSystem)
                                                    .filter(c => c.title.toLowerCase().includes(caseSearch.toLowerCase()));
                                                return filtered.length === 0 ? (
                                                    <p className="text-sm px-3 py-4" style={{ color: P.muted }}>No cases match "{caseSearch}"</p>
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        {filtered.map((c) => (
                                                            <button
                                                                key={c.id}
                                                                onClick={() => { setSelectedCase(c); setCaseSelected(true); setIsRandomCase(false); }}
                                                                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-colors hover:bg-white/5 group"
                                                            >
                                                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: P.accentBg }}>
                                                                    <Stethoscope size={13} style={{ color: P.accent }} />
                                                                </div>
                                                                <span className="flex-1 text-sm font-medium" style={{ color: P.text }}>
                                                                    {caseSearch ? c.title.split(new RegExp(`(${caseSearch})`, 'gi')).map((part, i) =>
                                                                        part.toLowerCase() === caseSearch.toLowerCase()
                                                                            ? <mark key={i} style={{ background: P.accentBg, color: P.accent, borderRadius: 3 }}>{part}</mark>
                                                                            : part
                                                                    ) : c.title}
                                                                </span>
                                                                <ChevronRight size={13} className="opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" style={{ color: P.accent }} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* ── Right: 3D Manikin HUD ── */}
                            <div className="flex-1 relative overflow-hidden">

                                {/* background atmosphere */}
                                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 55% 45%, rgba(110,231,183,0.07) 0%, transparent 60%)' }} />
                                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 25% 75%, rgba(59,130,246,0.05) 0%, transparent 50%)' }} />
                                {/* dot grid */}
                                <div className="absolute inset-0 pointer-events-none" style={{
                                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)',
                                    backgroundSize: '24px 24px',
                                }} />
                                {/* bottom fade */}
                                <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-10" style={{ background: 'linear-gradient(to top, hsl(var(--background)), transparent)' }} />

                                {/* ── Corner brackets (HUD frame) ── */}
                                {[
                                    { top: 12, left: 12, borderTop: true, borderLeft: true },
                                    { top: 12, right: 12, borderTop: true, borderRight: true },
                                    { bottom: 12, left: 12, borderBottom: true, borderLeft: true },
                                    { bottom: 12, right: 12, borderBottom: true, borderRight: true },
                                ].map((pos, i) => (
                                    <div key={i} className="absolute pointer-events-none z-20" style={{
                                        top: pos.top, left: pos.left, right: pos.right, bottom: pos.bottom,
                                        width: 22, height: 22,
                                        borderTop: pos.borderTop ? `2px solid rgba(110,231,183,0.35)` : 'none',
                                        borderLeft: pos.borderLeft ? `2px solid rgba(110,231,183,0.35)` : 'none',
                                        borderRight: pos.borderRight ? `2px solid rgba(110,231,183,0.35)` : 'none',
                                        borderBottom: pos.borderBottom ? `2px solid rgba(110,231,183,0.35)` : 'none',
                                    }} />
                                ))}

                                {/* ── Top bar ── */}
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
                                    style={{ background: 'rgba(10,10,10,0.6)', border: `1px solid ${P.border}`, backdropFilter: 'blur(8px)' }}>
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: P.accent }} />
                                    <span className="text-[11px] font-semibold tracking-wide" style={{ color: P.text }}>Anatomy Simulator</span>
                                    <span className="text-[11px]" style={{ color: P.muted }}>· Drag to rotate</span>
                                </div>

                                {/* ── Left side vitals ── */}
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5 pointer-events-none">
                                    {/* Heart Rate */}
                                    <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(10,10,10,0.65)', border: '1px solid rgba(239,68,68,0.25)', backdropFilter: 'blur(10px)', minWidth: 110 }}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Heart size={11} style={{ color: '#f87171' }} />
                                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#f87171' }}>Heart Rate</span>
                                        </div>
                                        <p className="text-lg font-bold leading-none" style={{ color: P.text }}>88 <span className="text-xs font-normal" style={{ color: P.muted }}>bpm</span></p>
                                        {/* mini ECG line */}
                                        <svg width="80" height="18" viewBox="0 0 80 18" className="mt-1.5 opacity-60">
                                            <polyline points="0,10 12,10 16,3 20,16 24,10 28,10 36,10 40,5 44,14 48,10 80,10"
                                                fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    {/* Temperature */}
                                    <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(10,10,10,0.65)', border: '1px solid rgba(251,191,36,0.2)', backdropFilter: 'blur(10px)', minWidth: 110 }}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Thermometer size={11} style={{ color: '#fbbf24' }} />
                                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#fbbf24' }}>Temp</span>
                                        </div>
                                        <p className="text-lg font-bold leading-none" style={{ color: P.text }}>37.8 <span className="text-xs font-normal" style={{ color: P.muted }}>°C</span></p>
                                    </div>
                                    {/* Weight */}
                                    <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(10,10,10,0.65)', border: `1px solid ${P.border}`, backdropFilter: 'blur(10px)', minWidth: 110 }}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Scale size={11} style={{ color: P.muted }} />
                                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.muted }}>Weight</span>
                                        </div>
                                        <p className="text-lg font-bold leading-none" style={{ color: P.text }}>78 <span className="text-xs font-normal" style={{ color: P.muted }}>kg</span></p>
                                    </div>
                                </div>

                                {/* ── Right side vitals ── */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5 pointer-events-none">
                                    {/* SpO2 */}
                                    <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(10,10,10,0.65)', border: '1px solid rgba(96,165,250,0.25)', backdropFilter: 'blur(10px)', minWidth: 110 }}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Wind size={11} style={{ color: '#60a5fa' }} />
                                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#60a5fa' }}>SpO₂</span>
                                        </div>
                                        <p className="text-lg font-bold leading-none" style={{ color: P.text }}>97 <span className="text-xs font-normal" style={{ color: P.muted }}>%</span></p>
                                        {/* SpO2 bar */}
                                        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                            <div className="h-full rounded-full" style={{ width: '97%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />
                                        </div>
                                    </div>
                                    {/* Resp Rate */}
                                    <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(10,10,10,0.65)', border: '1px solid rgba(110,231,183,0.2)', backdropFilter: 'blur(10px)', minWidth: 110 }}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Activity size={11} style={{ color: P.accent }} />
                                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.accent }}>Resp Rate</span>
                                        </div>
                                        <p className="text-lg font-bold leading-none" style={{ color: P.text }}>18 <span className="text-xs font-normal" style={{ color: P.muted }}>/min</span></p>
                                    </div>
                                    {/* Age */}
                                    <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(10,10,10,0.65)', border: `1px solid ${P.border}`, backdropFilter: 'blur(10px)', minWidth: 110 }}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <User size={11} style={{ color: P.muted }} />
                                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.muted }}>Age</span>
                                        </div>
                                        <p className="text-lg font-bold leading-none" style={{ color: P.text }}>45 <span className="text-xs font-normal" style={{ color: P.muted }}>yrs</span></p>
                                    </div>
                                </div>

                                {/* ── Patient Info Widget ── */}
                                <div className="absolute bottom-10 left-4 z-20 rounded-2xl overflow-hidden pointer-events-none"
                                    style={{ width: 210, background: 'rgba(8,8,8,0.72)', border: `1px solid ${P.border}`, backdropFilter: 'blur(14px)' }}>
                                    {/* header */}
                                    <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${P.border}` }}>
                                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: P.muted }}>Patient Info</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(110,231,183,0.1)', color: P.accent }}>Pre-session</span>
                                    </div>
                                    {/* avatar + identity */}
                                    <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: `1px solid ${P.border}` }}>
                                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                                            style={{ background: 'linear-gradient(145deg, rgba(90,125,138,0.4) 0%, rgba(40,60,80,0.6) 100%)', border: `1px solid ${P.border}` }}>
                                            <User size={18} style={{ color: '#52525b' }} />
                                            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)' }} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1 mb-1">
                                                <span className="text-[10px] px-1.5 py-px rounded font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: P.tagText }}>78 kg</span>
                                                <span className="text-[10px] px-1.5 py-px rounded font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>A+</span>
                                            </div>
                                            <p className="text-xs font-bold" style={{ color: P.text }}>Unknown Patient</p>
                                            <p className="text-[10px]" style={{ color: P.muted }}>Male · 45 years old</p>
                                        </div>
                                    </div>
                                    {/* vitals */}
                                    <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${P.border}` }}>
                                        <div className="px-3 py-2" style={{ borderRight: `1px solid ${P.border}` }}>
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <Activity size={9} style={{ color: '#f87171' }} />
                                                <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: P.muted }}>BP</span>
                                            </div>
                                            <p className="text-xs font-bold" style={{ color: P.text }}>120/80 <span className="text-[9px] font-normal" style={{ color: P.muted }}>mmHg</span></p>
                                        </div>
                                        <div className="px-3 py-2">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <Heart size={9} style={{ color: '#f87171' }} />
                                                <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: P.muted }}>HR</span>
                                            </div>
                                            <p className="text-xs font-bold" style={{ color: P.text }}>88 <span className="text-[9px] font-normal" style={{ color: P.muted }}>bpm</span></p>
                                        </div>
                                    </div>
                                    {/* body condition */}
                                    <div className="px-3 py-2.5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: P.muted }}>Body Condition</span>
                                            <span className="text-[10px] font-bold" style={{ color: P.accent }}>96%</span>
                                        </div>
                                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                            <div className="h-full rounded-full" style={{ width: '96%', background: `linear-gradient(90deg, ${P.accent}80, ${P.accent})` }} />
                                        </div>
                                        <p className="text-[9px] mt-1" style={{ color: P.muted }}>Stable · no prior conditions</p>
                                    </div>
                                </div>

                                {/* ── Bottom system tags ── */}
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-none">
                                    {systems.map(({ name, icon: Icon, color, bg }) => (
                                        <div key={name} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                                            style={{ background: 'rgba(10,10,10,0.65)', border: `1px solid ${P.border}`, backdropFilter: 'blur(8px)' }}>
                                            <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: bg }}>
                                                <Icon size={10} style={{ color }} />
                                            </div>
                                            <span className="text-[11px] font-medium" style={{ color: P.tagText }}>{name}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* ── 3D model ── */}
                                {/* eslint-disable-next-line react/no-unknown-property */}
                                <model-viewer
                                    src="/human_anatomy_male_torso.glb"
                                    alt="Practice manikin"
                                    auto-rotate
                                    auto-rotate-delay="500"
                                    rotation-per-second="12deg"
                                    camera-controls
                                    disable-zoom
                                    camera-orbit="0deg 75deg 2.2m"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        background: 'transparent',
                                        '--progress-bar-color': 'transparent',
                                        '--progress-mask': 'transparent',
                                    }}
                                />
                            </div>

                        </div>
                    );
                })()}

                {/* Step 1: History Taking */}
                {currentStep === 1 && (
                    <div className="h-full flex flex-col">
                        {/* Chief Complaint bar */}
                        {selectedCase && (
                            <div className="flex-shrink-0 px-4 pt-3 pb-1">
                                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    {/* Patient photo */}
                                    <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden" style={{ border: '1.5px solid rgba(110,231,183,0.25)', background: 'rgba(110,231,183,0.08)' }}>
                                        {selectedPatient?.photo
                                            ? <img src={selectedPatient.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: selectedPatient.photo_position || 'center' }} />
                                            : <div className="w-full h-full flex items-center justify-center"><User size={16} style={{ color: '#6ee7b7' }} /></div>
                                        }
                                    </div>
                                    {/* Label + text */}
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[10px] font-bold uppercase tracking-widest block mb-0.5" style={{ color: 'rgba(110,231,183,0.6)' }}>Chief Complaint</span>
                                        <p className="text-sm italic leading-snug truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                            "{selectedCase?.chief_complaint || CHIEF_COMPLAINTS[getCaseMockKey(selectedCase)] || CHIEF_COMPLAINTS.pneumonia}"
                                        </p>
                                    </div>
                                    {/* Case tag */}
                                    {!hideCaseIdentity && !isRandomCase && (
                                        <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{selectedCase.title}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Main Two-Column Layout */}
                        <div className="flex-1 flex overflow-hidden p-4 gap-4 min-h-0">
                            {/* LEFT COLUMN: Chat */}
                            <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.07)' }}>

                                {/* Header */}
                                <div className="px-5 py-3.5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)' }} />
                                        <span className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>Patient Conversation</span>
                                        {lastReplySource && (
                                            <span
                                                className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                                                title="AI that generated the last patient reply"
                                                style={{
                                                    background: lastReplySource === 'groq'
                                                        ? 'rgba(59,130,246,0.12)'
                                                        : lastReplySource === 'ollama'
                                                            ? 'rgba(168,85,247,0.12)'
                                                            : 'rgba(255,255,255,0.06)',
                                                    color: lastReplySource === 'groq'
                                                        ? '#93c5fd'
                                                        : lastReplySource === 'ollama'
                                                            ? '#d8b4fe'
                                                            : 'rgba(255,255,255,0.45)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                }}
                                            >
                                                {lastReplySource === 'groq' ? 'Groq' : lastReplySource === 'ollama' ? 'Ollama' : 'Canned'}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                                        style={voiceEnabled
                                            ? { background: 'rgba(110,231,183,0.1)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.2)' }
                                            : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    >
                                        {voiceEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
                                        {voiceEnabled ? 'Voice On' : 'Voice Off'}
                                    </button>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={cn('flex gap-2.5', msg.role === 'student' ? 'justify-end' : 'justify-start', msg.role === 'alert' && 'justify-center', msg.role === 'system' && 'justify-center')}>

                                            {/* Patient avatar dot */}
                                            {msg.role === 'patient' && (
                                                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)' }}>
                                                    {selectedPatient?.photo
                                                        ? <img src={selectedPatient.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', objectPosition: selectedPatient.photo_position || 'center' }} />
                                                        : <User size={12} style={{ color: '#6ee7b7' }} />
                                                    }
                                                </div>
                                            )}

                                            {msg.role === 'patient' && (
                                                <div className="max-w-[78%] flex flex-col gap-1">
                                                    <span className="text-[10px] font-semibold ml-1" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
                                                        {selectedPatient?.name || 'Patient'}
                                                    </span>
                                                    <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            )}

                                            {msg.role === 'student' && (
                                                <div className="max-w-[78%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed" style={{ background: 'linear-gradient(135deg, rgba(110,231,183,0.2) 0%, rgba(59,130,246,0.15) 100%)', border: '1px solid rgba(110,231,183,0.2)', color: '#f4f4f5' }}>
                                                    {msg.content}
                                                </div>
                                            )}

                                            {msg.role === 'system' && (
                                                <div className="px-4 py-2 rounded-xl text-xs text-center" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: 'rgba(251,191,36,0.8)', maxWidth: '90%' }}>
                                                    {msg.content}
                                                </div>
                                            )}

                                            {msg.role === 'alert' && (
                                                <div className="px-4 py-2 rounded-xl text-xs text-center font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', maxWidth: '90%' }}>
                                                    {msg.content}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Typing indicator */}
                                    {isTyping && (
                                        <div className="flex gap-2.5 justify-start">
                                            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)' }}>
                                                {selectedPatient?.photo
                                                    ? <img src={selectedPatient.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', objectPosition: selectedPatient.photo_position || 'center' }} />
                                                    : <User size={12} style={{ color: '#6ee7b7' }} />
                                                }
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-semibold ml-1" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>{selectedPatient?.name || 'Patient'}</span>
                                                <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <div className="flex gap-1.5 items-center">
                                                        {[0, 1, 2].map(i => (
                                                            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(110,231,183,0.7)', animation: 'typingDot 1.2s ease-in-out infinite', animationDelay: `${i * 0.18}s` }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                <style>{`
                                    @keyframes typingDot {
                                        0%, 100% { opacity: 0.3; transform: translateY(0); }
                                        50% { opacity: 1; transform: translateY(-3px); }
                                    }
                                `}</style>

                                {/* Last transcript pill */}
                                {lastTranscript && !isRecording && !sttReviewReady && (
                                    <div className="px-4 pb-2 flex-shrink-0">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                            <Mic size={9} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                            <span className="text-[10px] italic truncate max-w-[220px]" style={{ color: 'rgba(255,255,255,0.4)' }}>&quot;{lastTranscript}&quot;</span>
                                        </div>
                                    </div>
                                )}

                                {/* Input area */}
                                <div className="p-3 flex-shrink-0">
                                    {isRecording && (
                                        <div className="flex flex-col items-center gap-1.5 mb-2">
                                            <div className="flex items-center gap-2 py-1.5 px-4 rounded-full w-fit" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                <span className="text-xs font-medium" style={{ color: '#f87171' }}>Listening — speak now</span>
                                            </div>
                                            {/* Live mic level bar — DOM-driven, no React re-renders */}
                                            <div className="w-40 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                                <div
                                                    ref={micLevelBarRef}
                                                    className="h-full rounded-full"
                                                    style={{ width: '0%', transition: 'width 80ms linear', background: 'rgba(255,255,255,0.2)' }}
                                                />
                                            </div>
                                            <span ref={micLevelLabelRef} className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }} />
                                        </div>
                                    )}
                                    {isTranscribing && (
                                        <div className="flex items-center justify-center gap-2 mb-2 py-1.5 px-4 rounded-full mx-auto w-fit" style={{ background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)' }}>
                                            <svg className="animate-spin w-3 h-3 flex-shrink-0" style={{ color: '#6ee7b7' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            <span className="text-xs font-medium" style={{ color: '#6ee7b7' }}>Transcribing…</span>
                                        </div>
                                    )}
                                    {sttReviewReady && inputValue.trim() && !isRecording && !isTranscribing && (
                                        <div
                                            className="flex flex-wrap items-center justify-between gap-2 mb-2 py-2 px-3 rounded-xl"
                                            style={{ background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.22)' }}
                                        >
                                            <span className="text-xs font-medium" style={{ color: '#6ee7b7' }}>
                                                Review your transcription — edit if needed, then Send
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleReRecord}
                                                disabled={isTyping || isSpeaking}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                                                style={{ color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                                            >
                                                <RotateCcw size={11} />
                                                Re-record
                                            </button>
                                        </div>
                                    )}
                                    <div
                                        className="rounded-2xl overflow-hidden transition-all"
                                        style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${
                                                isRecording
                                                    ? 'rgba(239,68,68,0.3)'
                                                    : sttReviewReady
                                                        ? 'rgba(110,231,183,0.35)'
                                                        : 'rgba(255,255,255,0.09)'
                                            }`,
                                        }}
                                    >
                                        <textarea
                                            ref={chatInputRef}
                                            rows={1}
                                            placeholder={
                                                isRecording
                                                    ? 'Listening...'
                                                    : sttReviewReady
                                                        ? 'Edit your question before sending...'
                                                        : 'Ask the patient a question...'
                                            }
                                            className="w-full bg-transparent px-4 pt-3.5 pb-2 text-sm focus:outline-none resize-none placeholder:text-white/20"
                                            style={{ color: '#f4f4f5', minHeight: 48, maxHeight: 120, caretColor: '#6ee7b7', lineHeight: 1.5 }}
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={isTyping || isRecording || isTranscribing || isSpeaking}
                                        />
                                        <div className="flex items-center justify-between px-3 pb-3 pt-1">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={toggleRecording}
                                                    disabled={isTyping || isSpeaking || isTranscribing}
                                                    className="p-2 rounded-xl transition-all"
                                                    style={isRecording
                                                        ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                                                        : isTranscribing
                                                            ? { color: '#6ee7b7', background: 'rgba(110,231,183,0.08)' }
                                                            : { color: 'rgba(255,255,255,0.3)', background: 'transparent' }}
                                                    title={isRecording ? 'Click to stop and transcribe' : isTranscribing ? 'Transcribing…' : 'Click to record (click again when done)'}
                                                >
                                                    {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                                                </button>
                                                {!isRecording && !isTranscribing && (
                                                    <span className="text-[10px] select-none" style={{ color: 'rgba(255,255,255,0.2)' }}>Space</span>
                                                )}
                                                {isRecording && (
                                                    <span className="text-[10px] select-none" style={{ color: '#f87171' }}>Release</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!inputValue.trim() || isTyping || isSpeaking || isRecording || isTranscribing}
                                                title={sttReviewReady ? 'Send edited message to patient' : 'Send message'}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                                                style={inputValue.trim() && !isRecording && !isTranscribing
                                                    ? {
                                                        background: 'linear-gradient(135deg, #6ee7b7, #3b82f6)',
                                                        color: '#0a0a0a',
                                                        boxShadow: sttReviewReady
                                                            ? '0 4px 18px rgba(110,231,183,0.4)'
                                                            : '0 4px 14px rgba(110,231,183,0.25)',
                                                    }
                                                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }}
                                            >
                                                <Send size={13} />
                                                {sttReviewReady ? 'Send to patient' : 'Send'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Manikin + overlaid widgets */}
                            <div className="hidden lg:flex relative rounded-xl overflow-hidden min-h-0 flex-shrink-0" style={{ width: 620, marginLeft: 'auto', background: 'radial-gradient(ellipse at 50% 30%, rgba(110,231,183,0.04) 0%, transparent 70%), hsl(var(--card))', border: '1px solid rgba(255,255,255,0.06)' }}>

                                {/* Top bar */}
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full pointer-events-none"
                                    style={{ background: 'rgba(10,10,10,0.6)', border: `1px solid ${P.border}`, backdropFilter: 'blur(10px)' }}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: P.accent, boxShadow: `0 0 6px ${P.accent}` }} />
                                    <span className="text-[11px] font-semibold" style={{ color: P.text }}>Anatomy Simulator</span>
                                    <span style={{ color: P.muted, fontSize: 10 }}>· Drag to rotate</span>
                                </div>

                                {/* Left vitals */}
                                <div className="absolute left-3 top-16 z-20 flex flex-col gap-2 pointer-events-none">
                                    {/* Heart Rate */}
                                    <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(10,10,10,0.65)', border: '1px solid rgba(248,113,113,0.25)', backdropFilter: 'blur(10px)', minWidth: 105 }}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <Heart size={10} style={{ color: '#f87171' }} />
                                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#f87171' }}>Heart Rate</span>
                                        </div>
                                        <p className="text-base font-bold leading-none" style={{ color: P.text }}>
                                            {patientStatus.heartRate}
                                        </p>
                                        <svg width="72" height="16" viewBox="0 0 72 16" className="mt-1 opacity-60">
                                            <polyline points="0,9 10,9 14,3 18,14 22,9 26,9 32,9 36,5 40,13 44,9 72,9"
                                                fill="none" stroke='#f87171' strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    {/* Temp */}
                                    <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(10,10,10,0.65)', border: '1px solid rgba(251,191,36,0.2)', backdropFilter: 'blur(10px)', minWidth: 105 }}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <Thermometer size={10} style={{ color: '#fbbf24' }} />
                                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#fbbf24' }}>Temp</span>
                                        </div>
                                        <p className="text-base font-bold leading-none" style={{ color: P.text }}>{patientStatus.temperature}</p>
                                    </div>
                                    {/* Weight */}
                                    <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(10,10,10,0.65)', border: `1px solid ${P.border}`, backdropFilter: 'blur(10px)', minWidth: 105 }}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <Scale size={10} style={{ color: P.muted }} />
                                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: P.muted }}>Weight</span>
                                        </div>
                                        <p className="text-base font-bold leading-none" style={{ color: P.text }}>{selectedPatient?.weight_kg ?? '—'} <span className="text-[10px] font-normal" style={{ color: P.muted }}>kg</span></p>
                                    </div>
                                </div>

                                {/* Right vitals */}
                                <div className="absolute right-3 top-16 z-20 flex flex-col gap-2 pointer-events-none">
                                    {/* SpO2 */}
                                    <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(10,10,10,0.65)', border: `1px solid rgba(96,165,250,0.25)`, backdropFilter: 'blur(10px)', minWidth: 105 }}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <Wind size={10} style={{ color: '#60a5fa' }} />
                                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#60a5fa' }}>SpO₂</span>
                                        </div>
                                        <p className="text-base font-bold leading-none" style={{ color: patientStatus.spO2 < 95 ? '#fbbf24' : P.text }}>
                                            {patientStatus.spO2} <span className="text-[10px] font-normal" style={{ color: P.muted }}>%</span>
                                        </p>
                                        <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${patientStatus.spO2}%`, background: 'linear-gradient(90deg,#3b82f6,#60a5fa)' }} />
                                        </div>
                                    </div>
                                    {/* Resp Rate */}
                                    <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(10,10,10,0.65)', border: `1px solid rgba(110,231,183,0.2)`, backdropFilter: 'blur(10px)', minWidth: 105 }}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <Activity size={10} style={{ color: P.accent }} />
                                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: P.accent }}>Resp Rate</span>
                                        </div>
                                        <p className="text-base font-bold leading-none" style={{ color: P.text }}>
                                            {patientStatus.respiratoryRate} <span className="text-[10px] font-normal" style={{ color: P.muted }}>/min</span>
                                        </p>
                                    </div>
                                    {/* Age */}
                                    <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(10,10,10,0.65)', border: `1px solid ${P.border}`, backdropFilter: 'blur(10px)', minWidth: 105 }}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <User size={10} style={{ color: P.muted }} />
                                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: P.muted }}>Age</span>
                                        </div>
                                        <p className="text-base font-bold leading-none" style={{ color: P.text }}>{selectedPatient?.age ?? '—'} <span className="text-[10px] font-normal" style={{ color: P.muted }}>yrs</span></p>
                                    </div>
                                </div>

                                {/* Patient Info widget — bottom left */}
                                {selectedPatient && (
                                    <div className="absolute bottom-10 left-3 z-20 rounded-2xl overflow-hidden pointer-events-none"
                                        style={{ width: 210, background: 'rgba(8,8,8,0.75)', border: `1px solid ${P.border}`, backdropFilter: 'blur(14px)' }}>
                                        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${P.border}` }}>
                                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: P.muted }}>Patient Info</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(110,231,183,0.1)', color: P.accent }}>Active</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: `1px solid ${P.border}` }}>
                                            <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden" style={{ border: `1px solid ${P.border}` }}>
                                                <img src={selectedPatient.photo} alt={selectedPatient.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: selectedPatient.photo_position || 'center' }}
                                                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1 mb-1">
                                                    <span className="text-[10px] px-1.5 py-px rounded font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: P.tagText }}>{selectedPatient.weight_kg} kg</span>
                                                    <span className="text-[10px] px-1.5 py-px rounded font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>{selectedPatient.blood_type}</span>
                                                </div>
                                                <p className="text-xs font-bold" style={{ color: P.text }}>{selectedPatient.name}</p>
                                                <p className="text-[10px]" style={{ color: P.muted }}>{selectedPatient.gender} · {selectedPatient.age} years old</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${P.border}` }}>
                                            <div className="px-3 py-2" style={{ borderRight: `1px solid ${P.border}` }}>
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <Activity size={9} style={{ color: '#f87171' }} />
                                                    <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: P.muted }}>BP</span>
                                                </div>
                                                <p className="text-xs font-bold" style={{ color: P.text }}>{selectedPatient.vitals.bp} <span className="text-[9px] font-normal" style={{ color: P.muted }}>mmHg</span></p>
                                            </div>
                                            <div className="px-3 py-2">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <Heart size={9} style={{ color: '#f87171' }} />
                                                    <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: P.muted }}>HR</span>
                                                </div>
                                                <p className="text-xs font-bold" style={{ color: P.text }}>{patientStatus.heartRate}</p>
                                            </div>
                                        </div>
                                        <div className="px-3 py-2.5">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: P.muted }}>Body Condition</span>
                                                <span className="text-[10px] font-bold" style={{ color: selectedPatient.body_condition >= 80 ? P.accent : selectedPatient.body_condition >= 60 ? '#fbbf24' : '#f87171' }}>
                                                    {selectedPatient.body_condition}%
                                                </span>
                                            </div>
                                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                                <div className="h-full rounded-full" style={{
                                                    width: `${selectedPatient.body_condition}%`,
                                                    background: selectedPatient.body_condition >= 80 ? `linear-gradient(90deg,${P.accent}80,${P.accent})` : selectedPatient.body_condition >= 60 ? 'linear-gradient(90deg,#fbbf2480,#fbbf24)' : 'linear-gradient(90deg,#f8717180,#f87171)'
                                                }} />
                                            </div>
                                            <p className="text-[9px] mt-1" style={{ color: P.muted }}>{selectedPatient.body_condition_label}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Timer + hint — bottom right */}
                                <div className="absolute bottom-10 right-3 z-20 flex flex-col gap-2 pointer-events-none" style={{ width: 120 }}>
                                    <div className="rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(10,10,10,0.65)', border: `1px solid ${P.border}`, backdropFilter: 'blur(10px)' }}>
                                        <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color: P.muted }}>
                                            <Clock size={10} />
                                            <span className="text-[9px] font-semibold uppercase tracking-wide">Timer</span>
                                        </div>
                                        <span className="text-base font-bold font-mono" style={{ color: P.text }}>{formatTime(elapsedTime)}</span>
                                    </div>
                                    <div className="rounded-xl px-3 py-2 pointer-events-auto" style={{ background: 'rgba(10,10,10,0.65)', border: `1px solid ${P.border}`, backdropFilter: 'blur(10px)' }}>
                                        {showHint ? (
                                            <>
                                                <button onClick={() => setShowHint(false)} className="flex items-center gap-1 mb-1 hover:opacity-80 transition-opacity" style={{ color: P.accent }}>
                                                    <Brain size={10} /><span className="text-[9px] font-bold">Hide Hint</span>
                                                </button>
                                                <p className="text-[9px] leading-relaxed" style={{ color: P.muted }}>Ask about duration, severity, triggers, past history.</p>
                                            </>
                                        ) : (
                                            <button onClick={() => setShowHint(true)} className="w-full flex items-center justify-center gap-1 hover:opacity-80 transition-opacity" style={{ color: P.muted }}>
                                                <Brain size={12} /><span className="text-[10px] font-medium">Hint</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* 3D Manikin */}
                                {/* eslint-disable-next-line react/no-unknown-property */}
                                <model-viewer
                                    src="/human_anatomy_male_torso.glb"
                                    alt="Patient manikin"
                                    auto-rotate
                                    auto-rotate-delay="500"
                                    rotation-per-second="10deg"
                                    camera-controls
                                    disable-zoom
                                    camera-orbit="0deg 75deg 2.2m"
                                    style={{
                                        width: '100%', height: '100%',
                                        background: 'transparent',
                                        '--progress-bar-color': 'transparent',
                                        '--progress-mask': 'transparent',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Bottom Action Button */}
                        <div className="flex-shrink-0 px-4 pb-4 pt-2 flex justify-end">
                            {standaloneHistoryOnly ? (
                                <button
                                    onClick={onExit}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 border border-white/10 transition-all duration-200"
                                >
                                    Back to app
                                    <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={goNext}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200"
                                >
                                    Proceed to Evaluation
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Evaluation */}
                {currentStep === 2 && (() => {
                    const evalScore = historyEvalResult
                        ? Math.round((historyEvalResult.items_covered / historyEvalResult.total_items) * 100)
                        : null;
                    const isExamStudent = isAssignedExam && role === 'student';
                    const showEvalPercentToStudent = !isExamStudent;

                    const copyEvaluationSummary = async () => {
                        const diagnosisName = casesFromDb.find(c => c.id === selectedDiagnosis)?.title || 'Not selected';
                        const r = historyEvalResult;
                        const checklistLines = r
                            ? r.sections.flatMap(s => [
                                `\n[${s.label}]`,
                                ...s.items.map(i => `  ${i.num}. [${i.covered ? '✓' : '✗'}] ${i.text}${i.notes ? ` — ${i.notes}` : ''}`)
                              ]).join('\n')
                            : '  (scoring unavailable)';
                        const summary = [
                            'OSCE HISTORY-TAKING EVALUATION',
                            '='.repeat(32),
                            `Case: ${selectedCase?.title || 'Unknown'} (${selectedCase?.category || ''})`,
                            `Items Covered: ${r ? `${r.items_covered}/${r.total_items}` : 'N/A'}`,
                            '',
                            'CHECKLIST:',
                            checklistLines,
                            '',
                            `STRUCTURE FOLLOWED: ${r?.structure_followed ? 'Yes ✓' : 'No ✗'}`,
                            r?.structure_notes ? `Note: ${r.structure_notes}` : '',
                            '',
                            `DIAGNOSIS: ${diagnosisName} (${diagnosisConfidence}% confidence)`,
                            `Correct: ${selectedDiagnosis === selectedCase?.id ? 'Yes ✓' : 'No ✗'}`,
                            diagnosisRationale ? `Rationale: ${diagnosisRationale}` : '',
                            '',
                            'FEEDBACK:',
                            r?.feedback || '—',
                            '',
                            r?.strengths?.length ? `STRENGTHS:\n${r.strengths.map(s => `• ${s}`).join('\n')}` : '',
                            r?.areas_for_improvement?.length
                                ? `AREAS FOR IMPROVEMENT:\n${r.areas_for_improvement.map(a => `• ${a}`).join('\n')}`
                                : '',
                        ].filter(l => l !== undefined).join('\n').trim();

                        try {
                            await navigator.clipboard.writeText(summary);
                        } catch {
                            const ta = document.createElement('textarea');
                            ta.value = summary;
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand('copy');
                            document.body.removeChild(ta);
                        }
                        setCopiedToClipboard(true);
                        setTimeout(() => setCopiedToClipboard(false), 2000);
                    };

                    return (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
                                {/* LEFT: Evaluation Content */}
                                <div className="flex-1 lg:flex-[3] overflow-y-auto space-y-4 lg:pr-2 min-h-0">

                                    {canOfferCaseReveal && (
                                        <div className="rounded-xl border border-white/10 bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Case identity hidden</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Reveal the case name once after history evaluation (you can wait until physical evaluation instead).
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setPracticeCaseNameRevealed(true)}
                                                className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                            >
                                                Reveal case name
                                            </button>
                                        </div>
                                    )}

                                    {/* Case title (practice reveal or exam instructor) */}
                                    {(!hideCaseIdentity || (isAssignedExam && role !== 'student')) && (
                                    <div className="pt-1 pb-2">
                                        {isRandomCase && practiceCaseNameRevealed && (
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Case Revealed</p>
                                        )}
                                        <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl font-semibold text-foreground leading-tight">{selectedCase?.title}</h1>
                                        <p className="text-sm text-muted-foreground mt-1">{selectedCase?.category}</p>
                                    </div>
                                    )}

                                    {isExamStudent && historyEvalResult && !historyEvalLoading && (
                                        <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground/90">
                                            Your history-taking has been recorded. Your examiner will review the checklist and send your official score when ready.
                                        </div>
                                    )}

                                    {/* Header with live score badge */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                    <CheckCircle2 size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-bold text-foreground">History Evaluation</h2>
                                                    <p className="text-xs text-muted-foreground">
                                                        {historyEvalLoading ? 'Analyzing session…' : historyEvalResult ? `${historyEvalResult.items_covered}/${historyEvalResult.total_items} checklist items covered` : 'OSCE checklist review'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!historyEvalLoading && !isExamStudent && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setHistoryEvalResult(null);
                                                            setHistoryEvalError(null);
                                                            historyEvalDoneRef.current = false;
                                                            runHistoryEvaluation();
                                                        }}
                                                        className="text-xs px-2.5 py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-white/5 transition-colors"
                                                    >
                                                        Re-score
                                                    </button>
                                                )}
                                                {evalScore != null && !historyEvalLoading && showEvalPercentToStudent && (
                                                    <div className={cn(
                                                        "flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 font-bold text-lg",
                                                        evalScore >= 70 ? "border-emerald-500 text-emerald-400" :
                                                        evalScore >= 50 ? "border-amber-500 text-amber-400" : "border-red-500 text-red-400"
                                                    )}>
                                                        {evalScore}
                                                        <span className="text-[10px] font-normal text-muted-foreground leading-none">%</span>
                                                    </div>
                                                )}
                                                {evalScore != null && !historyEvalLoading && isExamStudent && (
                                                    <div className="text-xs text-muted-foreground text-right max-w-[120px]">
                                                        Score pending examiner review
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Loading state */}
                                    {historyEvalLoading && (
                                        <div className="bg-card border border-white/5 rounded-xl p-8 flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm text-muted-foreground">Scoring against OSCE checklist…</p>
                                        </div>
                                    )}

                                    {/* Error state */}
                                    {historyEvalError && !historyEvalLoading && (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                                            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                                            <p className="text-sm text-amber-300">{historyEvalError}</p>
                                        </div>
                                    )}

                                    {historyEvalSaveError && !historyEvalLoading && (
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                                            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                                            <p className="text-sm text-red-300">Could not save score: {historyEvalSaveError}</p>
                                        </div>
                                    )}

                                    {historyEvalSaved && !historyEvalSaveError && !historyEvalLoading && historyEvalResult && !isAssignedExam && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                                            <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                                            <p className="text-sm text-emerald-300">
                                                History-taking score saved ({evalScore ?? '—'}%). View it under My Sessions → History.
                                            </p>
                                        </div>
                                    )}

                                    {historyEvalSaved && !historyEvalSaveError && !historyEvalLoading && historyEvalResult && isAssignedExam && (
                                        <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground/90">
                                            History score recorded for this exam. Open <strong>OSCE Sessions</strong> → Review <strong>H</strong> to adjust the checklist, then send the result to the student.
                                        </div>
                                    )}

                                    {/* Real OSCE checklist sections (instructors/admins see full detail on exam) */}
                                    {historyEvalResult && !historyEvalLoading && showEvalPercentToStudent && historyEvalResult.sections?.map(section => {
                                        const sectionCovered = section.items.filter(i => i.covered).length;
                                        const sectionTotal = section.items.length;
                                        return (
                                            <div key={section.id} className="bg-card border border-white/5 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-foreground text-sm">{section.label}</h3>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">AI Detected</span>
                                                    </div>
                                                    <span className={cn(
                                                        "text-xs px-2 py-1 rounded-full font-medium",
                                                        sectionCovered === sectionTotal ? "bg-emerald-500/10 text-emerald-500" :
                                                        sectionCovered > 0 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-400"
                                                    )}>
                                                        {sectionCovered}/{sectionTotal}
                                                    </span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {section.items.map(item => (
                                                        <div
                                                            key={item.num}
                                                            className={cn(
                                                                "flex items-start gap-2.5 px-3 py-2 rounded-lg border text-sm",
                                                                item.covered
                                                                    ? "bg-emerald-500/8 border-emerald-500/20"
                                                                    : "bg-red-500/8 border-red-500/20"
                                                            )}
                                                        >
                                                            <span className={cn(
                                                                "shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                                item.covered ? "bg-emerald-500 text-white" : "bg-red-500/50 text-white"
                                                            )}>
                                                                {item.covered ? '✓' : '✗'}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <span className={cn(
                                                                    "leading-snug",
                                                                    item.covered ? "text-foreground/80" : "text-muted-foreground"
                                                                )}>
                                                                    <span className="text-muted-foreground/50 mr-1">{item.num}.</span>
                                                                    {item.text}
                                                                </span>
                                                                {item.notes && (
                                                                    <p className="text-[11px] text-amber-400/80 mt-0.5">{item.notes}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Structure / order feedback */}
                                    {historyEvalResult && !historyEvalLoading && showEvalPercentToStudent && (
                                        <div className={cn(
                                            "rounded-xl border p-4 flex items-start gap-3",
                                            historyEvalResult.structure_followed
                                                ? "bg-emerald-500/8 border-emerald-500/20"
                                                : "bg-amber-500/8 border-amber-500/20"
                                        )}>
                                            <span className={historyEvalResult.structure_followed ? "text-emerald-400" : "text-amber-400"}>
                                                {historyEvalResult.structure_followed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                            </span>
                                            <div>
                                                <p className={cn("text-sm font-medium", historyEvalResult.structure_followed ? "text-emerald-400" : "text-amber-400")}>
                                                    {historyEvalResult.structure_followed ? "Correct section order followed" : "Section order needs attention"}
                                                </p>
                                                {historyEvalResult.structure_notes && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{historyEvalResult.structure_notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Feedback */}
                                    {historyEvalResult && !historyEvalLoading && showEvalPercentToStudent && (
                                        <div className="bg-card border border-white/5 rounded-xl p-4 space-y-3">
                                            <h3 className="font-semibold text-foreground text-sm">Examiner Feedback</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{historyEvalResult.feedback}</p>
                                            {historyEvalResult.strengths?.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-emerald-400 mb-1.5">Strengths</p>
                                                    <ul className="space-y-1">
                                                        {historyEvalResult.strengths.map((s, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                                <span className="text-emerald-500 mt-0.5 shrink-0">•</span>{s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Areas for improvement — collapsed toggle */}
                                            {historyEvalResult.areas_for_improvement?.length > 0 && (
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowMissedQuestions(v => !v)}
                                                        className="w-full flex items-center justify-between text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                                                    >
                                                        <span>Areas for improvement ({historyEvalResult.areas_for_improvement.length})</span>
                                                        <ChevronRight size={14} className={cn("transition-transform", showMissedQuestions && "rotate-90")} />
                                                    </button>
                                                    {showMissedQuestions && (
                                                        <ul className="mt-2 space-y-1">
                                                            {historyEvalResult.areas_for_improvement.map((a, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                                    <span className="text-amber-500 mt-0.5 shrink-0">•</span>{a}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Diagnosis Guess */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground text-sm mb-3">Your Diagnosis</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-muted-foreground mb-1.5 block">Select diagnosis</label>
                                                <select
                                                    value={selectedDiagnosis}
                                                    onChange={(e) => setSelectedDiagnosis(e.target.value)}
                                                    className="w-full bg-muted/50 border border-white/5 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                >
                                                    <option value="">-- Select a diagnosis --</option>
                                                    {casesFromDb.map(c => (
                                                        <option key={c.id} value={c.id}>{c.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="text-xs text-muted-foreground">Confidence</label>
                                                    <span className="text-xs font-medium text-foreground">{diagnosisConfidence}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={diagnosisConfidence}
                                                    onChange={(e) => setDiagnosisConfidence(Number(e.target.value))}
                                                    className="w-full h-2 bg-muted/50 rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground mb-1.5 block">Rationale (optional)</label>
                                                <textarea
                                                    value={diagnosisRationale}
                                                    onChange={(e) => setDiagnosisRationale(e.target.value)}
                                                    placeholder="Explain your reasoning…"
                                                    rows={2}
                                                    className="w-full bg-muted/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Copy summary */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <button
                                            type="button"
                                            onClick={copyEvaluationSummary}
                                            disabled={historyEvalLoading}
                                            className={cn(
                                                "w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                                                copiedToClipboard
                                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                                                    : "bg-muted/50 text-foreground border border-white/5 hover:bg-muted"
                                            )}
                                        >
                                            {copiedToClipboard ? (
                                                <><CheckCircle2 size={16} /> Copied!</>
                                            ) : (
                                                <><FileText size={16} /> Copy evaluation summary</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* RIGHT: Session snapshot */}
                                <div className="flex flex-col gap-4 min-w-0 w-full lg:w-auto lg:flex-[2] shrink-0">
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                                            <FileText size={14} className="text-primary" />
                                            Session Snapshot
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">Case:</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {hideCaseIdentity ? 'Assigned case' : selectedCase?.title}
                                                    </span>
                                                    {selectedCase && !hideCaseIdentity && (
                                                        <span className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                            selectedCase.category === 'Cardiac'
                                                                ? "bg-red-500/10 text-red-400"
                                                                : "bg-blue-500/10 text-blue-400"
                                                        )}>
                                                            {selectedCase.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Duration:</span>
                                                <span className="text-sm font-medium text-foreground">{formatTime(elapsedTime)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Questions:</span>
                                                <span className="text-sm font-medium text-foreground">{messages.filter(m => m.role === 'student').length}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vitals Summary */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                                            <Activity size={14} className="text-primary" />
                                            Current Vitals
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 bg-muted/30 rounded-lg text-center">
                                                <span className="text-[10px] text-muted-foreground block">Temp</span>
                                                <span className="text-xs font-semibold text-amber-500">{patientStatus.temperature}</span>
                                            </div>
                                            <div className="p-2 bg-muted/30 rounded-lg text-center">
                                                <span className="text-[10px] text-muted-foreground block">HR</span>
                                                <span className="text-xs font-semibold text-foreground">{patientStatus.heartRate}</span>
                                            </div>
                                            <div className="p-2 bg-muted/30 rounded-lg text-center">
                                                <span className="text-[10px] text-muted-foreground block">SpO₂</span>
                                                <span className={cn(
                                                    "text-xs font-semibold",
                                                    patientStatus.spO2 < 95 ? "text-amber-500" : "text-emerald-500"
                                                )}>{patientStatus.spO2}%</span>
                                            </div>
                                            <div className="p-2 bg-muted/30 rounded-lg text-center">
                                                <span className="text-[10px] text-muted-foreground block">RR</span>
                                                <span className="text-xs font-semibold text-foreground">{patientStatus.respiratoryRate}/m</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Buttons */}
                            <div className="flex-shrink-0 p-4 pt-0 flex justify-between">
                                <button
                                    onClick={goBack}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-muted/50 text-foreground border border-white/5 hover:bg-muted transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                    Back to History
                                </button>
                                <button
                                    onClick={goNext}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                                >
                                    Continue to Physical Exam
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Step 3: Physical Exam — manikin + patient card + chatbot */}
                {currentStep === 3 && (
                    <div className="h-full flex flex-col min-h-0">
                        <div className="flex-1 flex flex-col lg:flex-row min-h-0 p-4 gap-4 overflow-hidden">
                            {/* Manikin + patient persona */}
                            <div className="flex-[1.15] flex flex-col bg-card border border-white/5 rounded-xl overflow-hidden min-w-0 min-h-[280px] lg:min-h-0">
                                <div className="bg-muted/30 border-b border-white/5 px-4 py-3 flex items-center justify-between flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Stethoscope size={16} className="text-primary" />
                                        <span className="font-semibold text-foreground text-sm">Physical Examination</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Click body zones to examine</span>
                                </div>
                                <div className="flex-1 flex flex-col sm:flex-row min-h-0 gap-3 p-3">
                                <div className="flex-1 flex items-center justify-center min-h-[240px] min-w-0">
                                    <div className="relative w-full max-w-md h-full max-h-[520px] bg-gradient-to-b from-muted/30 to-muted/10 rounded-2xl border border-white/10">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="relative w-36 h-56">
                                                <div
                                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-2 border-white/20"
                                                    style={{ background: 'linear-gradient(145deg, rgba(90,125,138,0.4) 0%, rgba(61,90,106,0.3) 100%)' }}
                                                />
                                                <div
                                                    className="absolute top-16 left-1/2 -translate-x-1/2 w-24 h-32 rounded-t-2xl rounded-b-lg border-2 border-white/20"
                                                    style={{ background: 'linear-gradient(145deg, rgba(90,125,138,0.3) 0%, rgba(61,90,106,0.2) 100%)' }}
                                                />
                                                <div className="absolute top-[4.5rem] -left-5 w-5 h-24 rounded-full border-2 border-white/20 bg-white/5" />
                                                <div className="absolute top-[4.5rem] -right-5 w-5 h-24 rounded-full border-2 border-white/20 bg-white/5" />
                                            </div>
                                        </div>
                                        {BODY_ZONES.map((zone) => (
                                            <button
                                                key={zone.id}
                                                type="button"
                                                onClick={() => handleZoneClick(zone)}
                                                className={cn(
                                                    'absolute w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 border-2',
                                                    selectedZone?.id === zone.id
                                                        ? zone.type === 'cardiac'
                                                            ? 'bg-red-500 border-red-400 text-white scale-110 shadow-lg shadow-red-500/30'
                                                            : 'bg-blue-500 border-blue-400 text-white scale-110 shadow-lg shadow-blue-500/30'
                                                        : zone.type === 'cardiac'
                                                            ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/40 hover:scale-105'
                                                            : 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/40 hover:scale-105'
                                                )}
                                                style={{
                                                    top: zone.position.top,
                                                    left: zone.position.left,
                                                    transform: `translate(-50%, -50%) ${selectedZone?.id === zone.id ? 'scale(1.1)' : ''}`,
                                                }}
                                                title={zone.label}
                                            >
                                                {zone.type === 'cardiac' ? <Heart size={14} /> : <Wind size={14} />}
                                            </button>
                                        ))}
                                        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1 justify-center">
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Lung zones</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">Heart zones</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Patient persona card */}
                                {selectedPatient && (
                                    <div
                                        className="w-full sm:w-[210px] shrink-0 rounded-2xl overflow-hidden flex flex-col"
                                        style={{ background: 'rgba(8,8,8,0.75)', border: `1px solid ${P.border}` }}
                                    >
                                        <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${P.border}` }}>
                                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: P.muted }}>Patient</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(110,231,183,0.1)', color: P.accent }}>Active</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: `1px solid ${P.border}` }}>
                                            <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden" style={{ border: `1px solid ${P.border}` }}>
                                                {selectedPatient.photo ? (
                                                    <img
                                                        src={selectedPatient.photo}
                                                        alt={selectedPatient.name}
                                                        className="w-full h-full object-cover"
                                                        style={{ objectPosition: selectedPatient.photo_position || 'center' }}
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-muted/30">
                                                        <User size={20} className="text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-1 mb-1">
                                                    <span className="text-[10px] px-1.5 py-px rounded font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: P.tagText }}>{selectedPatient.weight_kg} kg</span>
                                                    {selectedPatient.blood_type && (
                                                        <span className="text-[10px] px-1.5 py-px rounded font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>{selectedPatient.blood_type}</span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold truncate" style={{ color: P.text }}>{selectedPatient.name}</p>
                                                <p className="text-[10px]" style={{ color: P.muted }}>{selectedPatient.gender} · {selectedPatient.age} yrs</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 text-center" style={{ borderBottom: `1px solid ${P.border}` }}>
                                            <div className="px-2 py-2" style={{ borderRight: `1px solid ${P.border}` }}>
                                                <span className="text-[9px] uppercase tracking-wide font-semibold block" style={{ color: P.muted }}>BP</span>
                                                <p className="text-xs font-bold" style={{ color: P.text }}>{selectedPatient.vitals?.bp ?? '—'}</p>
                                            </div>
                                            <div className="px-2 py-2">
                                                <span className="text-[9px] uppercase tracking-wide font-semibold block" style={{ color: P.muted }}>HR</span>
                                                <p className="text-xs font-bold" style={{ color: P.text }}>{patientStatus.heartRate}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-px px-2 py-2 text-center" style={{ background: P.border }}>
                                            <div className="rounded-lg py-1.5" style={{ background: 'rgba(8,8,8,0.75)' }}>
                                                <span className="text-[9px] block" style={{ color: P.muted }}>SpO₂</span>
                                                <span className="text-xs font-bold" style={{ color: patientStatus.spO2 < 95 ? '#f87171' : P.accent }}>{patientStatus.spO2}%</span>
                                            </div>
                                            <div className="rounded-lg py-1.5" style={{ background: 'rgba(8,8,8,0.75)' }}>
                                                <span className="text-[9px] block" style={{ color: P.muted }}>RR</span>
                                                <span className="text-xs font-bold" style={{ color: P.text }}>{patientStatus.respiratoryRate}</span>
                                            </div>
                                        </div>
                                        {selectedPatient.occupation && (
                                            <p className="px-3 py-2 text-[10px] leading-snug" style={{ color: P.muted }}>
                                                {selectedPatient.occupation}
                                            </p>
                                        )}
                                    </div>
                                )}
                                </div>
                            </div>

                            {/* Chatbot */}
                            <div className="flex-1 flex flex-col min-w-0 min-h-[400px] lg:min-h-0 h-full">
                                <PhysicalExamChat
                                    className="flex-1 h-full"
                                    caseId={selectedCase?.id || getCaseMockKey(selectedCase)}
                                    caseTitle={selectedCase?.title || ''}
                                    caseCategory={selectedCase?.category || ''}
                                    symptoms={CASE_SYMPTOMS[getCaseMockKey(selectedCase)] || []}
                                    chiefComplaint={
                                        selectedCase?.chief_complaint
                                        || CHIEF_COMPLAINTS[getCaseMockKey(selectedCase)]
                                        || ''
                                    }
                                    patientId={selectedPatient?.id || ''}
                                    patientName={selectedPatient?.name || ''}
                                    onConversationUpdate={setPhysicalExamMessages}
                                />
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex-shrink-0 border-t border-white/5 bg-card/50 px-6 py-4 flex items-center justify-between">
                            <button
                                onClick={goBack}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-muted/50 text-foreground border border-white/5 hover:bg-muted transition-colors"
                            >
                                <ChevronLeft size={16} />
                                Back to Evaluation
                            </button>
                            <button
                                onClick={goNext}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                            >
                                Proceed to Physical Evaluation
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Physical Evaluation */}
                {currentStep === 4 && (() => {
                    const evalScore = physicalEvalResult
                        ? Math.round((physicalEvalResult.items_covered / physicalEvalResult.total_items) * 100)
                        : null;
                    const isExamStudent = isAssignedExam && role === 'student';
                    const showEvalPercentToStudent = !isExamStudent;
                    const hasExamActivity =
                        physicalExamMessages.some((m) => m.role === 'student') || examLog.length > 0;

                    const copyPhysicalEvaluationSummary = async () => {
                        const r = physicalEvalResult;
                        const checklistLines = r
                            ? r.sections.flatMap((s) => [
                                `\n[${s.label}]`,
                                ...s.items.map((i) => `  ${i.num}. [${i.covered ? '✓' : '✗'}] ${i.text}`),
                              ]).join('\n')
                            : '  (scoring unavailable)';
                        const summary = [
                            'OSCE PHYSICAL EXAMINATION EVALUATION',
                            '='.repeat(36),
                            `Case: ${selectedCase?.title || 'Unknown'} (${selectedCase?.category || ''})`,
                            `Items Covered: ${r ? `${r.items_covered}/${r.total_items}` : 'N/A'}`,
                            `Manikin zones examined: ${examLog.length}`,
                            '',
                            'CHECKLIST:',
                            checklistLines,
                            '',
                            `STRUCTURE FOLLOWED: ${r?.structure_followed ? 'Yes ✓' : 'No ✗'}`,
                            r?.structure_notes ? `Note: ${r.structure_notes}` : '',
                            '',
                            'FEEDBACK:',
                            r?.feedback || '—',
                            '',
                            r?.strengths?.length ? `STRENGTHS:\n${r.strengths.map((s) => `• ${s}`).join('\n')}` : '',
                            r?.areas_for_improvement?.length
                                ? `AREAS FOR IMPROVEMENT:\n${r.areas_for_improvement.map((a) => `• ${a}`).join('\n')}`
                                : '',
                        ].filter((l) => l !== undefined).join('\n').trim();

                        try {
                            await navigator.clipboard.writeText(summary);
                        } catch {
                            const ta = document.createElement('textarea');
                            ta.value = summary;
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand('copy');
                            document.body.removeChild(ta);
                        }
                        setCopiedPhysicalToClipboard(true);
                        setTimeout(() => setCopiedPhysicalToClipboard(false), 2000);
                    };

                    return (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
                                <div className="flex-1 lg:flex-[3] overflow-y-auto space-y-4 lg:pr-2 min-h-0">
                                    {canOfferCaseReveal && (
                                        <div className="rounded-xl border border-white/10 bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Case identity hidden</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Reveal the case name once after physical examination evaluation.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setPracticeCaseNameRevealed(true)}
                                                className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                            >
                                                Reveal case name
                                            </button>
                                        </div>
                                    )}

                                    {(!hideCaseIdentity || (isAssignedExam && role !== 'student')) && (
                                        <div className="pt-1 pb-2">
                                            {isRandomCase && practiceCaseNameRevealed && (
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Case Revealed</p>
                                            )}
                                            <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl font-semibold text-foreground leading-tight">{selectedCase?.title}</h1>
                                            <p className="text-sm text-muted-foreground mt-1">{selectedCase?.category}</p>
                                        </div>
                                    )}

                                    {isExamStudent && physicalEvalResult && !physicalEvalLoading && (
                                        <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground/90">
                                            Your physical examination has been recorded. Your examiner will review the checklist and send your official score when ready.
                                        </div>
                                    )}

                                    {/* Header with live score badge — same layout as History Evaluation */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                    <CheckCircle2 size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-bold text-foreground">Physical Evaluation</h2>
                                                    <p className="text-xs text-muted-foreground">
                                                        {physicalEvalLoading
                                                            ? 'Analyzing session…'
                                                            : physicalEvalResult
                                                                ? `${physicalEvalResult.items_covered}/${physicalEvalResult.total_items} checklist items covered`
                                                                : 'OSCE checklist review'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!physicalEvalLoading && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setPhysicalEvalResult(null);
                                                            setPhysicalEvalError(null);
                                                            physicalEvalDoneRef.current = false;
                                                            runPhysicalEvaluation({ force: true });
                                                        }}
                                                        className="text-xs px-2.5 py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-white/5 transition-colors"
                                                    >
                                                        Re-score
                                                    </button>
                                                )}
                                                {evalScore != null && !physicalEvalLoading && showEvalPercentToStudent && (
                                                    <div className={cn(
                                                        'flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 font-bold text-lg',
                                                        evalScore >= 70 ? 'border-emerald-500 text-emerald-400' :
                                                        evalScore >= 50 ? 'border-amber-500 text-amber-400' : 'border-red-500 text-red-400'
                                                    )}>
                                                        {evalScore}
                                                        <span className="text-[10px] font-normal text-muted-foreground leading-none">%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!hasExamActivity && !physicalEvalLoading && (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
                                            <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
                                            <h3 className="font-semibold text-amber-500 mb-1">No Physical Examination Performed</h3>
                                            <p className="text-sm text-amber-400/80">
                                                You did not examine any zones or use the exam assistant. Go back to perform the physical examination.
                                            </p>
                                        </div>
                                    )}

                                    {physicalEvalLoading && (
                                        <div className="bg-card border border-white/5 rounded-xl p-8 flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm text-muted-foreground">Scoring against OSCE checklist…</p>
                                        </div>
                                    )}

                                    {physicalEvalError && !physicalEvalLoading && (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                                            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                                            <p className="text-sm text-amber-300">{physicalEvalError}</p>
                                        </div>
                                    )}

                                    {physicalEvalSaveError && !physicalEvalLoading && (
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                                            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                                            <p className="text-sm text-red-300">Could not save score: {physicalEvalSaveError}</p>
                                        </div>
                                    )}

                                    {physicalEvalSaved && !physicalEvalSaveError && !physicalEvalLoading && physicalEvalResult && !isAssignedExam && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                                            <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                                            <p className="text-sm text-emerald-300">
                                                Physical examination score saved ({evalScore ?? '—'}%). View it under My Sessions → History.
                                            </p>
                                        </div>
                                    )}

                                    {physicalEvalSaved && !physicalEvalSaveError && !physicalEvalLoading && physicalEvalResult && isAssignedExam && (
                                        <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground/90">
                                            Physical score recorded for this exam. Open <strong>OSCE Sessions</strong> → Review <strong>P</strong> to adjust the checklist, then send the result to the student.
                                        </div>
                                    )}

                                    {physicalEvalResult && !physicalEvalLoading && showEvalPercentToStudent && physicalEvalResult.sections?.map((section) => {
                                        const sectionCovered = section.items.filter((i) => i.covered).length;
                                        const sectionTotal = section.items.length;
                                        return (
                                            <div key={section.id} className="bg-card border border-white/5 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-foreground text-sm">{section.label}</h3>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Matched</span>
                                                    </div>
                                                    <span className={cn(
                                                        'text-xs px-2 py-1 rounded-full font-medium',
                                                        sectionCovered === sectionTotal ? 'bg-emerald-500/10 text-emerald-500' :
                                                        sectionCovered > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-400'
                                                    )}>
                                                        {sectionCovered}/{sectionTotal}
                                                    </span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {section.items.map((item) => (
                                                        <div
                                                            key={item.num}
                                                            className={cn(
                                                                'flex items-start gap-2.5 px-3 py-2 rounded-lg border text-sm',
                                                                item.covered
                                                                    ? 'bg-emerald-500/8 border-emerald-500/20'
                                                                    : 'bg-red-500/8 border-red-500/20'
                                                            )}
                                                        >
                                                            <span className={cn(
                                                                'shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center text-[10px] font-bold',
                                                                item.covered ? 'bg-emerald-500 text-white' : 'bg-red-500/50 text-white'
                                                            )}>
                                                                {item.covered ? '✓' : '✗'}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <span className={cn(
                                                                    'leading-snug',
                                                                    item.covered ? 'text-foreground/80' : 'text-muted-foreground'
                                                                )}>
                                                                    <span className="text-muted-foreground/50 mr-1">{item.num}.</span>
                                                                    {item.text}
                                                                </span>
                                                                {item.notes && (
                                                                    <p className="text-[11px] text-amber-400/80 mt-0.5">{item.notes}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {physicalEvalResult && !physicalEvalLoading && showEvalPercentToStudent && (
                                        <div className={cn(
                                            'rounded-xl border p-4 flex items-start gap-3',
                                            physicalEvalResult.structure_followed
                                                ? 'bg-emerald-500/8 border-emerald-500/20'
                                                : 'bg-amber-500/8 border-amber-500/20'
                                        )}>
                                            <span className={physicalEvalResult.structure_followed ? 'text-emerald-400' : 'text-amber-400'}>
                                                {physicalEvalResult.structure_followed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                            </span>
                                            <div>
                                                <p className={cn('text-sm font-medium', physicalEvalResult.structure_followed ? 'text-emerald-400' : 'text-amber-400')}>
                                                    {physicalEvalResult.structure_followed ? 'Correct section order followed' : 'Section order needs attention'}
                                                </p>
                                                {physicalEvalResult.structure_notes && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{physicalEvalResult.structure_notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {physicalEvalResult && !physicalEvalLoading && showEvalPercentToStudent && (
                                        <div className="bg-card border border-white/5 rounded-xl p-4 space-y-3">
                                            <h3 className="font-semibold text-foreground text-sm">Examiner Feedback</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{physicalEvalResult.feedback}</p>
                                            {physicalEvalResult.strengths?.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-emerald-400 mb-1.5">Strengths</p>
                                                    <ul className="space-y-1">
                                                        {physicalEvalResult.strengths.map((s, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                                <span className="text-emerald-500 mt-0.5 shrink-0">•</span>{s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {physicalEvalResult.areas_for_improvement?.length > 0 && (
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowMissedPhysicalItems((v) => !v)}
                                                        className="w-full flex items-center justify-between text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                                                    >
                                                        <span>Areas for improvement ({physicalEvalResult.areas_for_improvement.length})</span>
                                                        <ChevronRight size={14} className={cn('transition-transform', showMissedPhysicalItems && 'rotate-90')} />
                                                    </button>
                                                    {showMissedPhysicalItems && (
                                                        <ul className="mt-2 space-y-1">
                                                            {physicalEvalResult.areas_for_improvement.map((a, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                                    <span className="text-amber-500 mt-0.5 shrink-0">•</span>{a}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {physicalEvalResult && !physicalEvalLoading && showEvalPercentToStudent && (
                                        <div className="bg-card border border-white/5 rounded-xl p-4">
                                            <button
                                                type="button"
                                                onClick={copyPhysicalEvaluationSummary}
                                                disabled={physicalEvalLoading}
                                                className={cn(
                                                    'w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50',
                                                    copiedPhysicalToClipboard
                                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                                                        : 'bg-muted/50 text-foreground border border-white/5 hover:bg-muted'
                                                )}
                                            >
                                                {copiedPhysicalToClipboard ? (
                                                    <><CheckCircle2 size={16} /> Copied!</>
                                                ) : (
                                                    <><FileText size={16} /> Copy evaluation summary</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: Session snapshot (matches History Evaluation sidebar) */}
                                <div className="flex flex-col gap-4 min-w-0 w-full lg:w-auto lg:flex-[2] shrink-0">
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                                            <FileText size={14} className="text-primary" />
                                            Session Snapshot
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">Case:</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {hideCaseIdentity ? 'Assigned case' : selectedCase?.title}
                                                    </span>
                                                    {selectedCase && !hideCaseIdentity && (
                                                        <span className={cn(
                                                            'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                                            selectedCase.category === 'Cardiac'
                                                                ? 'bg-red-500/10 text-red-400'
                                                                : 'bg-blue-500/10 text-blue-400'
                                                        )}>
                                                            {selectedCase.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Duration:</span>
                                                <span className="text-sm font-medium text-foreground">{formatTime(elapsedTime)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Exam actions:</span>
                                                <span className="text-sm font-medium text-foreground">
                                                    {physicalExamMessages.filter((m) => m.role === 'student').length + examLog.length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                                            <Activity size={14} className="text-primary" />
                                            Current Vitals
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 bg-muted/30 rounded-lg text-center">
                                                <span className="text-[10px] text-muted-foreground block">Temp</span>
                                                <span className="text-xs font-semibold text-amber-500">{patientStatus.temperature}</span>
                                            </div>
                                            <div className="p-2 bg-muted/30 rounded-lg text-center">
                                                <span className="text-[10px] text-muted-foreground block">HR</span>
                                                <span className="text-xs font-semibold text-foreground">{patientStatus.heartRate}</span>
                                            </div>
                                            <div className="p-2 bg-muted/30 rounded-lg text-center">
                                                <span className="text-[10px] text-muted-foreground block">SpO₂</span>
                                                <span className={cn(
                                                    'text-xs font-semibold',
                                                    patientStatus.spO2 < 95 ? 'text-amber-500' : 'text-emerald-500'
                                                )}>{patientStatus.spO2}%</span>
                                            </div>
                                            <div className="p-2 bg-muted/30 rounded-lg text-center">
                                                <span className="text-[10px] text-muted-foreground block">RR</span>
                                                <span className="text-xs font-semibold text-foreground">{patientStatus.respiratoryRate}/m</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-shrink-0 p-4 pt-0 flex justify-between">
                                <button
                                    onClick={goBack}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-muted/50 text-foreground border border-white/5 hover:bg-muted transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                    Back to Physical Exam
                                </button>
                                <button
                                    onClick={handleFinishSession}
                                    disabled={isSavingSession}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSavingSession ? (
                                        <Activity size={16} className="animate-spin" />
                                    ) : (
                                        <ChevronRight size={16} />
                                    )}
                                    Finish Practice Session
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* COMPLETION SCREEN */}
                {showCompletionScreen && (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
                        <div 
                            className="max-w-md w-full mx-4 bg-card border border-white/10 rounded-2xl p-8 text-center"
                            style={{
                                boxShadow: '0 0 60px rgba(59, 130, 246, 0.15), 0 0 30px rgba(0, 0, 0, 0.3)'
                            }}
                        >
                            {/* Success Icon */}
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} className="text-emerald-500" />
                            </div>
                            
                            {/* Title */}
                            <h1 className="text-2xl font-bold text-foreground mb-2">
                                Session Complete
                            </h1>
                            
                            {/* Subtitle */}
                            <p className="text-lg text-primary mb-2">
                                Thank you for using Xpatient
                            </p>
                            
                            {/* Description */}
                            <p className="text-sm text-muted-foreground mb-4">
                                Your {isAssignedExam ? 'exam' : 'practice'} session has been recorded successfully.
                            </p>
                            {!isAssignedExam && (historyEvalResult?.total_items > 0 || physicalEvalResult?.total_items > 0) && (
                                <div className="mb-6 flex flex-wrap justify-center gap-3">
                                    {historyEvalResult?.total_items > 0 && (
                                        <div className="inline-flex flex-col items-center gap-1 px-6 py-4 rounded-xl bg-muted/30 border border-white/10">
                                            <span className="text-xs text-muted-foreground uppercase tracking-wider">History-taking</span>
                                            <span className="text-3xl font-bold text-primary tabular-nums">
                                                {Math.round((historyEvalResult.items_covered / historyEvalResult.total_items) * 100)}%
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {historyEvalResult.items_covered}/{historyEvalResult.total_items} checklist items
                                            </span>
                                        </div>
                                    )}
                                    {physicalEvalResult?.total_items > 0 && (
                                        <div className="inline-flex flex-col items-center gap-1 px-6 py-4 rounded-xl bg-muted/30 border border-white/10">
                                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Physical exam</span>
                                            <span className="text-3xl font-bold text-primary tabular-nums">
                                                {Math.round((physicalEvalResult.items_covered / physicalEvalResult.total_items) * 100)}%
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {physicalEvalResult.items_covered}/{physicalEvalResult.total_items} checklist items
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {isAssignedExam && (historyEvalSaved || physicalEvalSaved) && (
                                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                                    Exam scores recorded. From <strong>OSCE Sessions</strong>, use Review <strong>H</strong> (history) and <strong>P</strong> (physical) to edit checklists and send results to the student.
                                </p>
                            )}
                            {saveError && (
                                <p className="text-sm text-destructive mb-4">
                                    {saveError}
                                </p>
                            )}
                            
                            {/* Countdown */}
                            <div className="mb-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-full border border-white/5">
                                    <Clock size={14} className="text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Returning to dashboard in <span className="font-semibold text-foreground">{countdown}s</span>...
                                    </span>
                                </div>
                            </div>
                            
                            {/* Return Now Button */}
                            <button
                                onClick={handleReturnNow}
                                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-muted/50 text-foreground border border-white/10 hover:bg-muted transition-colors"
                            >
                                Return now
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StudentPracticeFlow;
