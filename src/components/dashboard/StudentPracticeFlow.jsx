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
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { selectPatientForCase } from '../../data/patients';
import { useAuth } from '../../context/AuthContext';
import {
    getPatientReplyApiUrl,
    getSttApiUrl,
    isFasterWhisperSttEnabled,
    recordAudioForStt,
    sendAudioToSttApi
} from '../../lib/sttFasterWhisper';

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

function StudentPracticeFlow({ onExit, standaloneHistoryOnly = false }) {
    const { user } = useAuth();

    const [currentStep, setCurrentStep] = useState(standaloneHistoryOnly ? 1 : 0);
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
    const [selectedSystem, setSelectedSystem] = useState(null);
    const [caseSearch, setCaseSearch] = useState('');
    const [patientStatus, setPatientStatus] = useState(INITIAL_VITALS);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const micLevelBarRef = useRef(null);
    const micLevelLabelRef = useRef(null);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [lastTranscript, setLastTranscript] = useState('');
    
    // Evaluation step states
    const [selectedDiagnosis, setSelectedDiagnosis] = useState('');
    const [diagnosisConfidence, setDiagnosisConfidence] = useState(50);
    const [diagnosisRationale, setDiagnosisRationale] = useState('');
    const [showMissedQuestions, setShowMissedQuestions] = useState(false);
    const [copiedToClipboard, setCopiedToClipboard] = useState(false);
    
    // Physical Exam step states
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
    const prewarmStreamRef = useRef(null);
    const sessionIdRef = useRef(null);



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
    }, [selectedCase]);

    // Pre-warm mic when entering history-taking step so getUserMedia is instant on first click
    useEffect(() => {
        if (currentStep !== 1 || !isFasterWhisperSttEnabled()) return;
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(s => { prewarmStreamRef.current = s; })
            .catch(() => {});
        return () => {
            prewarmStreamRef.current?.getTracks().forEach(t => t.stop());
            prewarmStreamRef.current = null;
        };
    }, [currentStep]);

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

    const handleRandomAll = () => {
        if (casesFromDb.length === 0) return;
        const pick = casesFromDb[Math.floor(Math.random() * casesFromDb.length)];
        setSelectedCase(pick);
        setCaseSelected(true);
    };

    const handleRandomFromSystem = () => {
        const pool = casesFromDb.filter(c => c.category === selectedSystem);
        if (pool.length === 0) return;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setSelectedCase(pick);
        setCaseSelected(true);
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
        if (!apiBase) { fallbackSpeak(text); return; }
        const gender = getVoiceGender(patient);
        const url = `${apiBase}/tts?text=${encodeURIComponent(text.trim())}&voice=${gender}`;
        const audio = new Audio(url);
        setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => { setIsSpeaking(false); fallbackSpeak(text); };
        audio.play().catch(() => { setIsSpeaking(false); fallbackSpeak(text); });
    }, [getVoiceGender, fallbackSpeak]);

    const handleSendMessage = useCallback(async () => {
        if (!inputValue.trim() || isTyping) return;

        const transcript = inputValue.trim();
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
        const apiBase = getPatientReplyApiUrl();
        if (apiBase) {
            try {
                const caseKey = getCaseMockKey(selectedCase);
                const res = await fetch(`${apiBase}/patient-reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        // Case context
                        case_id: selectedCase?.id || '',
                        case_title: selectedCase?.title || '',
                        case_category: selectedCase?.category || '',
                        symptoms: CASE_SYMPTOMS[caseKey] || [],
                        chief_complaint: selectedCase?.chief_complaint || CHIEF_COMPLAINTS[caseKey] || '',

                        // Patient identity — who the AI is playing
                        patient_id: selectedPatient?.id || '',
                        patient_name: selectedPatient?.name || 'Unknown Patient',
                        patient_age: selectedPatient?.age || '',
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
                const data = await res.json();
                if (res.ok && data?.revealed_symptoms) {
                    setRevealedSymptoms(data.revealed_symptoms);
                }
                patientResponse = (res.ok && data?.text) ? data.text : getPatientReply();
            } catch {
                patientResponse = getPatientReply();
            }
        } else {
            patientResponse = getPatientReply();
        }

        // Strip *expressions* from displayed text — they're for TTS only
        const displayText = patientResponse.replace(/\*[^*]+\*/g, '').replace(/\s+/g, ' ').trim();

        // Show text immediately
        const updatedMessages = [...messages, studentMessage, { role: 'patient', content: displayText, ts: Date.now() }];
        setMessages(prev => [...prev, { role: 'patient', content: displayText, ts: Date.now() }]);

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
                    case_title: selectedCase?.title || '',
                    symptoms: CASE_SYMPTOMS[caseKey] || [],
                    prior_summary: conversationSummary,
                }),
            })
                .then(r => r.json())
                .then(d => { if (d?.summary) setConversationSummary(d.summary); })
                .catch(() => {});
        }
        setIsTyping(false);

        if (voiceEnabled) {
            window.speechSynthesis.cancel();
            setIsSpeaking(true);
            fallbackSpeak(patientResponse, getVoiceGender(selectedPatient));
        }
    }, [inputValue, isTyping, getPatientReply, fallbackSpeak, voiceEnabled, selectedCase, selectedPatient, messages, getCaseMockKey, revealedSymptoms, conversationSummary]);

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
        if (error) {
            console.error('[STT] Error response:', error);
        }
        setMessages(prev => [...prev, { role: 'alert', content: message, ts: Date.now() }]);
    }, []);

    const stopMicLevelMonitor = useCallback(() => {
        if (micLevelBarRef.current) micLevelBarRef.current.style.width = '0%';
        if (micLevelLabelRef.current) micLevelLabelRef.current.textContent = '';
    }, []);

    const applySttTranscript = useCallback((text) => {
        const transcript = typeof text === 'string' ? text : '';
        setInputValue(transcript);
        setLastTranscript(transcript);
        if (!transcript.trim()) {
            reportSttIssue('No speech was detected. Please try again and speak clearly.');
        }
    }, [reportSttIssue]);

    // Focus textarea after transcription completes (isTranscribing → false re-enables it)
    useEffect(() => {
        if (!isTranscribing) chatInputRef.current?.focus();
    }, [isTranscribing]);

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
                        reportSttIssue('Speech transcription failed. Check your STT server and try again.', error);
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

        // Starting: prefer Faster-Whisper STT when API URL is set
        if (isFasterWhisperSttEnabled()) {
            setIsRecording(true);
            const handleAutoStop = () => {
                const ctrl = fwRecordingRef.current;
                if (!ctrl) return;
                fwRecordingRef.current = null;
                stopMicLevelMonitor();
                setIsRecording(false);
                setIsTranscribing(true);
                ctrl.stop()
                    .then((blob) => sendAudioToSttApi(blob))
                    .then(({ text }) => {
                        applySttTranscript(text);
                        setIsTranscribing(false);
                    })
                    .catch((error) => {
                        reportSttIssue('Speech transcription failed. Check your STT server and try again.', error);
                        setIsTranscribing(false);
                    });
            };
            const onLevel = (level) => {
                if (micLevelBarRef.current) {
                    micLevelBarRef.current.style.width = `${level}%`;
                    micLevelBarRef.current.style.background =
                        level > 60 ? 'linear-gradient(90deg,#6ee7b7,#3b82f6)' :
                        level > 20 ? '#6ee7b7' : 'rgba(255,255,255,0.2)';
                }
                if (micLevelLabelRef.current) {
                    micLevelLabelRef.current.textContent =
                        level < 5 ? 'No signal' : level < 20 ? 'Low' : level < 60 ? 'Good' : 'Strong';
                }
            };
            const controller = recordAudioForStt(handleAutoStop, onLevel);
            const existingStream = prewarmStreamRef.current;
            prewarmStreamRef.current = null;
            controller.start(existingStream)
                .then(() => { fwRecordingRef.current = controller; })
                .catch((error) => {
                    stopMicLevelMonitor();
                    setIsRecording(false);
                    reportSttIssue('Microphone access failed. Please allow microphone permissions and retry.', error);
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
                    setInputValue(transcript);
                    setLastTranscript(transcript);
                    setIsRecording(false);
                };

                recognitionRef.current.onerror = () => {
                    const mockText = getMockTranscript();
                    setInputValue(mockText);
                    setLastTranscript(mockText);
                    setIsRecording(false);
                };

                recognitionRef.current.onend = () => {
                    setIsRecording(false);
                };

                recognitionRef.current.start();
            } catch {
                mockRecordingTimeoutRef.current = setTimeout(() => {
                    const mockText = getMockTranscript();
                    setInputValue(mockText);
                    setLastTranscript(mockText);
                    setIsRecording(false);
                }, 1500);
            }
        } else {
            mockRecordingTimeoutRef.current = setTimeout(() => {
                const mockText = getMockTranscript();
                setInputValue(mockText);
                setLastTranscript(mockText);
                setIsRecording(false);
            }, 1500);
        }
    }, [isRecording, getMockTranscript, applySttTranscript, reportSttIssue, stopMicLevelMonitor]);

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

    // Compute history score (same logic as step 2 evaluation UI)
    const computeHistoryScore = useCallback(() => {
        const aiChecklist = {
            hpi: true,
            pmh: true,
            meds: true,
            allergies: false,
            socialHistory: true
        };
        const checklistCompleted = Object.values(aiChecklist).filter(Boolean).length;
        const aiRubricScores = {
            communication: 2,
            structure: 2,
            safety: 1,
            clinicalReasoning: 2,
            professionalism: 2
        };
        const rubricTotal = Object.values(aiRubricScores).reduce((a, b) => a + b, 0);
        let score = 0;
        score += checklistCompleted * 0.5;
        if (hasDeteriorated && redFlagRecognized) score += 1.5;
        if (selectedDiagnosis === selectedCase?.id) score += 1.5;
        score += (rubricTotal / 10) * 4.5;
        return Math.min(10, Math.round(score * 10) / 10);
    }, [hasDeteriorated, redFlagRecognized, selectedDiagnosis, selectedCase?.id]);

    // Compute physical score (same logic as step 4 evaluation UI)
    const computePhysicalScore = useCallback(() => {
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
    }, [selectedCase, getCaseMockKey, examLog]);

    // Create session row if not yet created; returns session_id.
    const ensureSessionCreated = useCallback(async () => {
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
    }, [user?.id, selectedCase?.id, sessionStartedAt]);

    // Insert/upsert skill score into session_scores. Uses upsert to avoid duplicates when re-submitting.
    const insertSessionScore = useCallback(async (sessionId, skillType, score) => {
        if (!sessionId || !skillType) return;
        const row = { session_id: sessionId, skill_type: skillType, score: Math.round(score) };
        await supabase
            .from('session_scores')
            .upsert(row, { onConflict: 'session_id,skill_type' });
    }, []);

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

            const physicalFeedback = (() => {
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

            // 2) Insert skill scores into session_scores (same session_id)
            await insertSessionScore(sessionId, 'history_taking', historyScore);
            await insertSessionScore(sessionId, 'physical_examination', physicalScore);

            // 3) Fetch all scores for this session
            const { data: scoreRows } = await supabase
                .from('session_scores')
                .select('score')
                .eq('session_id', sessionId);

            // 4) Calculate total/average score (only aggregate same session_id)
            const scores = (scoreRows || []).map((r) => r.score).filter((n) => n != null);
            const avgScore = scores.length > 0
                ? scores.reduce((sum, s) => sum + s, 0) / scores.length
                : ((historyScore + physicalScore) / 2); // fallback if fetch empty
            // Scale 0–10 → 0–100 for sessions.score
            const sessionScore = Math.round(avgScore * 10);

            // 5) Update sessions table
            await supabase
                .from('sessions')
                .update({
                    end_time: nowIso,
                    score: sessionScore,
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
        if (currentStep === 2 && user?.id) {
            try {
                const sid = await ensureSessionCreated();
                if (sid) {
                    const historyScore = computeHistoryScore();
                    await insertSessionScore(sid, 'history_taking', historyScore);
                }
            } catch (err) {
                console.error('Failed to save history score:', err);
            }
        }
        if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
    };

    const goBack = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            <header className="bg-card border-b border-white/5 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Brain size={22} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Practice Session</h1>
                        {selectedCase && (
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">Case: {selectedCase.title}</p>
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
                                                <p className="text-[17px] font-semibold leading-snug mb-3" style={{ color: P.text }}>{selectedCase.title}</p>
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
                                                                onClick={() => { setSelectedCase(c); setCaseSelected(true); }}
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
                                            "{selectedCase.chief_complaint || CHIEF_COMPLAINTS[getCaseMockKey(selectedCase)] || CHIEF_COMPLAINTS['pneumonia']}"
                                        </p>
                                    </div>
                                    {/* Case tag */}
                                    <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>{selectedCase.title}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Main Two-Column Layout */}
                        <div className="flex-1 flex overflow-hidden p-4 gap-4 min-h-0">
                            {/* LEFT COLUMN: Chat */}
                            <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.07)' }}>

                                {/* Header */}
                                <div className="px-5 py-3.5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)' }} />
                                        <span className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>Patient Conversation</span>
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
                                {lastTranscript && !isRecording && (
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
                                    <div className="rounded-2xl overflow-hidden transition-all" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isRecording ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.09)'}` }}>
                                        <textarea
                                            ref={chatInputRef}
                                            rows={1}
                                            placeholder={isRecording ? 'Listening...' : 'Ask the patient a question...'}
                                            className="w-full bg-transparent px-4 pt-3.5 pb-2 text-sm focus:outline-none resize-none placeholder:text-white/20"
                                            style={{ color: '#f4f4f5', minHeight: 48, maxHeight: 120, caretColor: '#6ee7b7', lineHeight: 1.5 }}
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={isTyping || isRecording || isTranscribing || isSpeaking}
                                        />
                                        <div className="flex items-center justify-between px-3 pb-3 pt-1">
                                            <button
                                                onClick={toggleRecording}
                                                disabled={isTyping || isSpeaking || isTranscribing}
                                                className="p-2 rounded-xl transition-all"
                                                style={isRecording
                                                    ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }
                                                    : isTranscribing
                                                        ? { color: '#6ee7b7', background: 'rgba(110,231,183,0.08)' }
                                                        : { color: 'rgba(255,255,255,0.3)', background: 'transparent' }}
                                                title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing…' : 'Voice input'}
                                            >
                                                {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                                            </button>
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!inputValue.trim() || isTyping || isSpeaking}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                                                style={inputValue.trim()
                                                    ? { background: 'linear-gradient(135deg, #6ee7b7, #3b82f6)', color: '#0a0a0a', boxShadow: '0 4px 14px rgba(110,231,183,0.25)' }
                                                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }}
                                            >
                                                <Send size={13} />
                                                Send
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
                    // AI-detected checklist (auto-filled, not user-editable)
                    const aiChecklist = {
                        hpi: true,
                        pmh: true,
                        meds: true,
                        allergies: false,
                        socialHistory: true
                    };
                    const checklistItems = [
                        { key: 'hpi', label: 'History of Present Illness (HPI)' },
                        { key: 'pmh', label: 'Past Medical History (PMH)' },
                        { key: 'meds', label: 'Medications' },
                        { key: 'allergies', label: 'Allergies' },
                        { key: 'socialHistory', label: 'Social History' }
                    ];
                    const checklistCompleted = Object.values(aiChecklist).filter(Boolean).length;
                    
                    // AI-scored rubric (auto-filled, not user-editable)
                    const aiRubricScores = {
                        communication: 2,
                        structure: 2,
                        safety: 1,
                        clinicalReasoning: 2,
                        professionalism: 2
                    };
                    const rubricCriteria = [
                        { key: 'communication', label: 'Communication' },
                        { key: 'structure', label: 'Structure' },
                        { key: 'safety', label: 'Safety' },
                        { key: 'clinicalReasoning', label: 'Clinical Reasoning' },
                        { key: 'professionalism', label: 'Professionalism' }
                    ];
                    const rubricTotal = Object.values(aiRubricScores).reduce((a, b) => a + b, 0);
                    
                    const missedQuestions = {
                        'pneumonia': [
                            'When did your symptoms first start? (onset/duration)',
                            'Can you describe your sputum? Color, amount, blood?',
                            'Have you had any fevers or chills?',
                            'Does the pain worsen when you breathe deeply? (pleuritic)',
                            'Any recent travel or sick contacts? (exposures)',
                            'Have you taken any antibiotics recently?'
                        ],
                        'asthma': [
                            'What triggers your breathing problems?',
                            'Do you wake up at night with symptoms?',
                            'How often do you use your inhaler?',
                            'Have you ever been admitted to ICU for breathing?',
                            'Do you have any known allergies?',
                            'Have you ever measured your peak flow?'
                        ],
                        'copd': [
                            'How many pack-years have you smoked?',
                            'How long have you had this chronic cough?',
                            'How often do you have exacerbations?',
                            'What inhalers are you currently using?',
                            'Have you ever needed oxygen at home?',
                            'How far can you walk before getting breathless?'
                        ],
                        'aortic-stenosis': [
                            'Do you get breathless on exertion?',
                            'Have you ever fainted or felt faint?',
                            'Do you get chest pain during activity?',
                            'Has anyone mentioned a heart murmur before?',
                            'Do you have any ankle swelling?',
                            'Any history of high blood pressure or high cholesterol?'
                        ],
                        'mitral-stenosis': [
                            'Did you have rheumatic fever as a child?',
                            'Do you need to sleep propped up on pillows?',
                            'Do you feel your heart racing or fluttering?',
                            'Have you coughed up any blood?',
                            'Do you have any ankle or leg swelling?',
                            'Are you pregnant or planning pregnancy?'
                        ]
                    };
                    
                    const getKeyFindings = () => {
                        const caseKey = getCaseMockKey(selectedCase);
                        const findings = {
                            'pneumonia': ['Fever present', 'Productive cough with yellow sputum', 'Pleuritic chest pain', 'Shortness of breath on exertion'],
                            'aortic-stenosis': ['Exertional chest pain', 'Syncope/near-syncope episodes', 'Exertional dyspnea', 'Reduced exercise tolerance'],
                            'mitral-stenosis': ['Palpitations reported', 'Hemoptysis (pink-tinged sputum)', 'Orthopnea', 'Fatigue with minimal exertion'],
                            'asthma': ['Nocturnal symptoms', 'Wheeze on triggers (cold, dust)', 'Chest tightness', 'Known allergies (cats, pollen)'],
                            'copd': ['30-year smoking history', 'Chronic productive cough', 'Progressive dyspnea', 'Reduced exercise capacity']
                        };
                        return findings[caseKey] || findings['pneumonia'];
                    };

                    const calculateScore = () => {
                        let score = 0;
                        // Checklist: 2.5 points max (0.5 per item)
                        score += checklistCompleted * 0.5;
                        // Diagnosis match: 1.5 points
                        if (selectedDiagnosis === selectedCase?.id) score += 1.5;
                        // Rubric: 4.5 points max (rubricTotal/10 * 4.5)
                        score += (rubricTotal / 10) * 4.5;
                        return Math.min(10, Math.round(score * 10) / 10);
                    };

                    const getFeedback = () => {
                        const score = calculateScore();
                        if (score >= 8) return "Excellent history taking! You covered all key areas systematically.";
                        if (score >= 6) return "Good history structure. Consider being more thorough with social history.";
                        if (score >= 4) return "Adequate attempt. Remember to always check allergies and medications.";
                        return "Keep practicing. Try to cover all OSCE checklist items systematically.";
                    };

                    const copyEvaluationSummary = async () => {
                        const keyFindings = getKeyFindings();
                        const diagnosisName = casesFromDb.find(c => c.id === selectedDiagnosis)?.title || 'Not selected';
                        const summary = `
OSCE EVALUATION SUMMARY
========================
Case: ${selectedCase?.title || 'Unknown'} (${selectedCase?.category || ''})

KEY FINDINGS:
${keyFindings.map(f => `• ${f}`).join('\n')}

CLINICAL CHECKLIST (AI Detected): ${checklistCompleted}/5 completed
- HPI: ${aiChecklist.hpi ? '✓' : '✗'}
- PMH: ${aiChecklist.pmh ? '✓' : '✗'}
- Medications: ${aiChecklist.meds ? '✓' : '✗'}
- Allergies: ${aiChecklist.allergies ? '✓' : '✗'}
- Social History: ${aiChecklist.socialHistory ? '✓' : '✗'}

DIAGNOSIS:
- Selected: ${diagnosisName}
- Confidence: ${diagnosisConfidence}%
- Correct: ${selectedDiagnosis === selectedCase?.id ? 'Yes ✓' : 'No ✗'}

OSCE RUBRIC (AI Scored): ${rubricTotal}/10
- Communication: ${aiRubricScores.communication}/2
- Structure: ${aiRubricScores.structure}/2
- Safety: ${aiRubricScores.safety}/2
- Clinical Reasoning: ${aiRubricScores.clinicalReasoning}/2
- Professionalism: ${aiRubricScores.professionalism}/2

FINAL SCORE: ${calculateScore()}/10
FEEDBACK: ${getFeedback()}
`.trim();
                        
                        try {
                            await navigator.clipboard.writeText(summary);
                            setCopiedToClipboard(true);
                            setTimeout(() => setCopiedToClipboard(false), 2000);
                        } catch {
                            // Fallback for older browsers
                            const textarea = document.createElement('textarea');
                            textarea.value = summary;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            setCopiedToClipboard(true);
                            setTimeout(() => setCopiedToClipboard(false), 2000);
                        }
                    };

                    const score = calculateScore();

                    return (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 flex overflow-hidden p-4 gap-4">
                                {/* LEFT: Evaluation Content */}
                                <div className="flex-[3] overflow-y-auto space-y-4 pr-2">
                                    {/* Header */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                <CheckCircle2 size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-foreground">Evaluation</h2>
                                                <p className="text-xs text-muted-foreground">Review your history taking performance</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Clinical Checklist (AI-Detected) */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-foreground text-sm">Clinical Checklist</h3>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                                    AI Detected
                                                </span>
                                            </div>
                                            <span className={cn(
                                                "text-xs px-2 py-1 rounded-full font-medium",
                                                checklistCompleted === 5 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                            )}>
                                                {checklistCompleted}/5 completed
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {checklistItems.map(item => (
                                                <div
                                                    key={item.key}
                                                    className={cn(
                                                        "flex items-center justify-between p-2.5 rounded-lg border",
                                                        aiChecklist[item.key]
                                                            ? "bg-emerald-500/10 border-emerald-500/30"
                                                            : "bg-red-500/10 border-red-500/30"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-4 h-4 rounded flex items-center justify-center",
                                                            aiChecklist[item.key] ? "bg-emerald-500" : "bg-red-500/50"
                                                        )}>
                                                            {aiChecklist[item.key] ? (
                                                                <CheckCircle2 size={12} className="text-white" />
                                                            ) : (
                                                                <X size={12} className="text-white" />
                                                            )}
                                                        </div>
                                                        <span className={cn(
                                                            "text-sm",
                                                            aiChecklist[item.key] ? "text-emerald-500" : "text-red-400"
                                                        )}>{item.label}</span>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                                        aiChecklist[item.key] 
                                                            ? "bg-emerald-500/20 text-emerald-400"
                                                            : "bg-red-500/20 text-red-400"
                                                    )}>
                                                        {aiChecklist[item.key] ? 'Covered' : 'Missed'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Key Findings */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground text-sm mb-3">Key Findings</h3>
                                        <ul className="space-y-2">
                                            {getKeyFindings().map((finding, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                                    <span className="text-muted-foreground">{finding}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

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
                                                    placeholder="Explain your reasoning..."
                                                    rows={2}
                                                    className="w-full bg-muted/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* OSCE Rubric (AI-Scored) */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-foreground text-sm">OSCE Rubric</h3>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                                    AI Scored
                                                </span>
                                            </div>
                                            <span className={cn(
                                                "text-xs px-2 py-1 rounded-full font-medium",
                                                rubricTotal >= 8 ? "bg-emerald-500/10 text-emerald-500" :
                                                rubricTotal >= 5 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                                            )}>
                                                {rubricTotal}/10
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {rubricCriteria.map(criterion => {
                                                const score = aiRubricScores[criterion.key];
                                                return (
                                                    <div 
                                                        key={criterion.key} 
                                                        className={cn(
                                                            "flex items-center justify-between p-2.5 rounded-lg border",
                                                            score === 2 ? "bg-emerald-500/10 border-emerald-500/30" :
                                                            score === 1 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30"
                                                        )}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className={cn(
                                                                "text-sm font-medium",
                                                                score === 2 ? "text-emerald-500" :
                                                                score === 1 ? "text-amber-500" : "text-red-400"
                                                            )}>{criterion.label}</span>
                                                            <span className="text-[10px] text-muted-foreground">Auto-scored</span>
                                                        </div>
                                                        <span className={cn(
                                                            "text-sm font-bold px-2 py-1 rounded",
                                                            score === 2 ? "bg-emerald-500/20 text-emerald-400" :
                                                            score === 1 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                                                        )}>
                                                            {score}/2
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Missed Questions */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <button
                                            onClick={() => setShowMissedQuestions(!showMissedQuestions)}
                                            className="w-full flex items-center justify-between text-sm font-semibold text-foreground"
                                        >
                                            <span>Show what you should've asked</span>
                                            <ChevronRight 
                                                size={16} 
                                                className={cn(
                                                    "text-muted-foreground transition-transform",
                                                    showMissedQuestions && "rotate-90"
                                                )} 
                                            />
                                        </button>
                                        {showMissedQuestions && (
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    Suggested questions for {selectedCase?.title}:
                                                </p>
                                                <ul className="space-y-2">
                                                    {(missedQuestions[getCaseMockKey(selectedCase)] || missedQuestions['pneumonia']).map((q, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm">
                                                            <span className="text-primary font-medium">{idx + 1}.</span>
                                                            <span className="text-muted-foreground">{q}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Score & Feedback */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground text-sm mb-3">Performance Score</h3>
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs text-muted-foreground">Score</span>
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    score >= 8 ? "text-emerald-500" : score >= 5 ? "text-amber-500" : "text-red-500"
                                                )}>
                                                    {score}/10
                                                </span>
                                            </div>
                                            <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                                                <div 
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-500",
                                                        score >= 8 ? "bg-emerald-500" : score >= 5 ? "bg-amber-500" : "bg-red-500"
                                                    )}
                                                    style={{ width: `${score * 10}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-muted/30 rounded-lg mb-3">
                                            <p className="text-sm text-muted-foreground">{getFeedback()}</p>
                                        </div>
                                        <button
                                            onClick={copyEvaluationSummary}
                                            className={cn(
                                                "w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                                                copiedToClipboard
                                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                                                    : "bg-muted/50 text-foreground border border-white/5 hover:bg-muted"
                                            )}
                                        >
                                            {copiedToClipboard ? (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <FileText size={16} />
                                                    Copy evaluation summary
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* RIGHT: Session Snapshot */}
                                <div className="hidden lg:flex flex-[2] flex-col gap-4 min-w-0">
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                                            <FileText size={14} className="text-primary" />
                                            Session Snapshot
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-muted-foreground">Case:</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-foreground">{selectedCase?.title}</span>
                                                    {selectedCase && (
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

                {/* Step 3: Physical Exam */}
                {currentStep === 3 && (
                    <div className="h-full flex flex-col">
                        {/* Main Two-Column Layout */}
                        <div className="flex-1 flex overflow-hidden p-4 gap-4">
                            {/* LEFT COLUMN: Manikin Body Map (60-65%) */}
                            <div className="flex-[3] flex flex-col bg-card border border-white/5 rounded-xl overflow-hidden min-w-0">
                                {/* Header */}
                                <div className="bg-muted/30 border-b border-white/5 px-4 py-3 flex items-center justify-between flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Stethoscope size={16} className="text-primary" />
                                        <span className="font-semibold text-foreground text-sm">Physical Examination (Demo)</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        Click body zones to examine
                                    </span>
                                </div>

                                {/* Body Map Area */}
                                <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                                    {/* Body Diagram Container */}
                                    <div className="relative mx-auto w-full max-w-sm aspect-[3/4] bg-gradient-to-b from-muted/30 to-muted/10 rounded-2xl border border-white/10 mb-4">
                                        {/* Body Silhouette Placeholder */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="relative w-32 h-48">
                                                {/* Head */}
                                                <div 
                                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-2 border-white/20"
                                                    style={{
                                                        background: 'linear-gradient(145deg, rgba(90,125,138,0.4) 0%, rgba(61,90,106,0.3) 100%)'
                                                    }}
                                                />
                                                {/* Torso */}
                                                <div 
                                                    className="absolute top-14 left-1/2 -translate-x-1/2 w-20 h-28 rounded-t-2xl rounded-b-lg border-2 border-white/20"
                                                    style={{
                                                        background: 'linear-gradient(145deg, rgba(90,125,138,0.3) 0%, rgba(61,90,106,0.2) 100%)'
                                                    }}
                                                />
                                                {/* Arms */}
                                                <div className="absolute top-16 -left-4 w-4 h-20 rounded-full border-2 border-white/20 bg-white/5" />
                                                <div className="absolute top-16 -right-4 w-4 h-20 rounded-full border-2 border-white/20 bg-white/5" />
                                            </div>
                                        </div>

                                        {/* Clickable Zone Buttons */}
                                        {BODY_ZONES.map((zone) => (
                                            <button
                                                key={zone.id}
                                                onClick={() => handleZoneClick(zone)}
                                                className={cn(
                                                    "absolute w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                                                    "border-2 text-xs font-bold",
                                                    selectedZone?.id === zone.id
                                                        ? zone.type === 'cardiac' 
                                                            ? "bg-red-500 border-red-400 text-white scale-110 shadow-lg shadow-red-500/30"
                                                            : "bg-blue-500 border-blue-400 text-white scale-110 shadow-lg shadow-blue-500/30"
                                                        : zone.type === 'cardiac'
                                                            ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/40 hover:scale-105"
                                                            : "bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/40 hover:scale-105"
                                                )}
                                                style={{
                                                    top: zone.position.top,
                                                    left: zone.position.left,
                                                    transform: `translate(-50%, -50%) ${selectedZone?.id === zone.id ? 'scale(1.1)' : ''}`
                                                }}
                                                title={zone.label}
                                            >
                                                {zone.type === 'cardiac' ? <Heart size={14} /> : <Wind size={14} />}
                                            </button>
                                        ))}

                                        {/* Zone Labels */}
                                        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1 justify-center">
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                Lung zones
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                                Heart zones
                                            </span>
                                        </div>
                                    </div>

                                    {/* Selected Zone Info */}
                                    {selectedZone && (
                                        <div className="bg-muted/30 border border-white/10 rounded-xl p-4 mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-3 h-3 rounded-full",
                                                        selectedZone.type === 'cardiac' ? "bg-red-500" : "bg-blue-500"
                                                    )} />
                                                    <span className="font-semibold text-foreground text-sm">{selectedZone.label}</span>
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded font-medium",
                                                    selectedZone.type === 'cardiac' 
                                                        ? "bg-red-500/20 text-red-400" 
                                                        : "bg-blue-500/20 text-blue-400"
                                                )}>
                                                    {selectedZone.type === 'cardiac' ? 'Cardiac' : 'Pulmonary'}
                                                </span>
                                            </div>
                                            
                                            <div className="mb-3">
                                                <span className="text-xs text-muted-foreground">Finding:</span>
                                                <p className="text-sm text-foreground mt-1 font-medium">{selectedFinding}</p>
                                            </div>

                                            <button
                                                onClick={handlePlaySound}
                                                disabled={playingSoundDemo}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                                                    playingSoundDemo
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                                                )}
                                            >
                                                <Play size={12} />
                                                {playingSoundDemo ? "Playing sound..." : "Play Sound (demo)"}
                                            </button>
                                        </div>
                                    )}

                                    {/* No zone selected placeholder */}
                                    {!selectedZone && (
                                        <div className="bg-muted/20 border border-white/5 rounded-xl p-6 text-center">
                                            <Stethoscope size={24} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                                            <p className="text-sm text-muted-foreground">
                                                Click on a body zone to examine
                                            </p>
                                            <p className="text-xs text-muted-foreground/60 mt-1">
                                                Blue = Lung auscultation • Red = Heart auscultation
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Exam Info Panel (35-40%) */}
                            <div className="hidden lg:flex flex-[2] flex-col gap-4 min-w-0">
                                {/* Patient Status Summary */}
                                <div className="bg-card border border-white/5 rounded-xl p-4">
                                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                                        <Activity size={14} className="text-primary" />
                                        Patient Status
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-muted/30 rounded-lg text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Thermometer size={10} />
                                                <span className="text-[10px]">Temp</span>
                                            </div>
                                            <span className="text-xs font-semibold text-amber-500">{patientStatus.temperature}</span>
                                        </div>
                                        <div className="p-2 bg-muted/30 rounded-lg text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Heart size={10} />
                                                <span className="text-[10px]">HR</span>
                                            </div>
                                            <span className="text-xs font-semibold text-foreground">{patientStatus.heartRate}</span>
                                        </div>
                                        <div className={cn(
                                            "p-2 rounded-lg text-center",
                                            patientStatus.spO2 < 95 ? "bg-red-500/20" : "bg-muted/30"
                                        )}>
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Activity size={10} />
                                                <span className="text-[10px]">SpO₂</span>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-semibold",
                                                patientStatus.spO2 < 95 ? "text-red-500" : "text-emerald-500"
                                            )}>{patientStatus.spO2}%</span>
                                        </div>
                                        <div className="p-2 bg-muted/30 rounded-lg text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Wind size={10} />
                                                <span className="text-[10px]">RR</span>
                                            </div>
                                            <span className="text-xs font-semibold text-foreground">{patientStatus.respiratoryRate}/m</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Physical Exam Checklist */}
                                <div className="bg-card border border-white/5 rounded-xl p-4">
                                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                                        <ListChecks size={14} className="text-primary" />
                                        Exam Checklist
                                    </h3>
                                    <div className="space-y-2">
                                        {EXAM_CHECKLIST_ITEMS.map((item) => {
                                            const IconComponent = item.icon;
                                            const isChecked = examChecklist[item.id];
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => toggleExamChecklistItem(item.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left",
                                                        isChecked
                                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                            : "bg-muted/20 border-white/5 text-muted-foreground hover:bg-muted/40"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-md flex items-center justify-center border",
                                                        isChecked
                                                            ? "bg-emerald-500 border-emerald-400"
                                                            : "bg-muted/50 border-white/10"
                                                    )}>
                                                        {isChecked && <CheckCircle2 size={12} className="text-white" />}
                                                    </div>
                                                    <IconComponent size={14} />
                                                    <span className="text-sm font-medium">{item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-white/5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium text-foreground">
                                                {Object.values(examChecklist).filter(Boolean).length}/4
                                            </span>
                                        </div>
                                        <div className="mt-1.5 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                                style={{ width: `${(Object.values(examChecklist).filter(Boolean).length / 4) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Exam Log */}
                                <div className="flex-1 bg-card border border-white/5 rounded-xl p-4 overflow-hidden flex flex-col">
                                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm flex-shrink-0">
                                        <FileText size={14} className="text-primary" />
                                        Exam Log
                                    </h3>
                                    <div className="flex-1 overflow-y-auto space-y-2">
                                        {examLog.length === 0 ? (
                                            <p className="text-xs text-muted-foreground/50 italic text-center py-4">
                                                No examinations yet
                                            </p>
                                        ) : (
                                            examLog.slice(0, 5).map((entry, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="p-2 bg-muted/20 rounded-lg border border-white/5"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium text-foreground">{entry.zone}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{entry.finding}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
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
                    const caseKey = getCaseMockKey(selectedCase);
                    const requirements = REQUIRED_ZONES_BY_CASE[caseKey] || REQUIRED_ZONES_BY_CASE['pneumonia'];
                    const examinedZoneIds = examLog.map(entry => {
                        const zone = BODY_ZONES.find(z => z.label === entry.zone);
                        return zone?.id;
                    }).filter(Boolean);
                    
                    const coveredRequiredZones = requirements.zones.filter(zoneId => examinedZoneIds.includes(zoneId));
                    const coverageComplete = coveredRequiredZones.length >= requirements.minRequired;
                    
                    // AI-filled physical rubric scores
                    const aiPhysicalRubric = {
                        technique: 2,
                        coverage: coverageComplete ? 2 : 1,
                        infectionControl: 2,
                        interpretation: 2,
                        communication: 1
                    };
                    const physicalRubricTotal = Object.values(aiPhysicalRubric).reduce((a, b) => a + b, 0);
                    
                    // AI-filled physical checklist
                    const aiPhysicalChecklist = {
                        inspection: true,
                        palpation: true,
                        percussion: false,
                        auscultation: examinedZoneIds.length > 0
                    };
                    const physicalChecklistCompleted = Object.values(aiPhysicalChecklist).filter(Boolean).length;
                    
                    // Calculate physical eval score
                    const calculatePhysicalScore = () => {
                        let score = 0;
                        // Coverage: 3 points max
                        score += (coveredRequiredZones.length / requirements.zones.length) * 3;
                        // Rubric: 4.5 points max
                        score += (physicalRubricTotal / 10) * 4.5;
                        // Checklist: 2.5 points max
                        score += (physicalChecklistCompleted / 4) * 2.5;
                        return Math.min(10, Math.round(score * 10) / 10);
                    };
                    const physicalScore = calculatePhysicalScore();
                    
                    // Generate feedback
                    const getPhysicalFeedback = () => {
                        if (examLog.length === 0) {
                            return "No physical examination was performed. Remember to examine relevant body zones.";
                        }
                        if (coverageComplete) {
                            return `Good coverage of ${requirements.label}. Systematic approach demonstrated.`;
                        }
                        return `Partial coverage. Remember to examine ${requirements.label} for this case.`;
                    };
                    
                    // Key findings based on zones examined
                    const getKeyPhysicalFindings = () => {
                        if (examLog.length === 0) return [];
                        const findings = [];
                        const hasLungZones = examinedZoneIds.some(id => id && !id.includes('heart'));
                        const hasCardiacZones = examinedZoneIds.some(id => id && id.includes('heart'));
                        
                        if (hasLungZones) {
                            const lungFindings = ZONE_FINDINGS[caseKey]?.lung || 'Normal breath sounds';
                            findings.push({ zone: 'Lung fields', finding: lungFindings });
                        }
                        if (hasCardiacZones) {
                            const cardiacFindings = ZONE_FINDINGS[caseKey]?.cardiac || 'Normal heart sounds';
                            findings.push({ zone: 'Cardiac', finding: cardiacFindings });
                        }
                        return findings;
                    };
                    const keyFindings = getKeyPhysicalFindings();
                    
                    return (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 flex overflow-hidden p-4 gap-4">
                                {/* LEFT COLUMN: Evaluation Content */}
                                <div className="flex-[3] flex flex-col gap-4 overflow-y-auto pr-2">
                                    {/* Header */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <ListChecks size={20} className="text-primary" />
                                            </div>
                                            <div>
                                                <h2 className="font-bold text-foreground">Physical Evaluation</h2>
                                                <p className="text-xs text-muted-foreground">AI-assessed physical examination performance</p>
                                            </div>
                                        </div>
                                    </div>

                                    {examLog.length === 0 ? (
                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
                                            <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
                                            <h3 className="font-semibold text-amber-500 mb-1">No Physical Examination Performed</h3>
                                            <p className="text-sm text-amber-400/80">
                                                You did not examine any body zones. Go back to perform the physical examination.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Exam Coverage */}
                                            <div className="bg-card border border-white/5 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-foreground text-sm">Exam Coverage</h3>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                                            AI Evaluated
                                                        </span>
                                                    </div>
                                                    <span className={cn(
                                                        "text-xs px-2 py-1 rounded-full font-medium",
                                                        coverageComplete ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                                    )}>
                                                        {coveredRequiredZones.length}/{requirements.zones.length} required
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-3">
                                                    Required for {selectedCase?.title}: {requirements.label}
                                                </p>
                                                <div className="space-y-2">
                                                    {requirements.zones.map((zoneId) => {
                                                        const zone = BODY_ZONES.find(z => z.id === zoneId);
                                                        const isExamined = examinedZoneIds.includes(zoneId);
                                                        return (
                                                            <div 
                                                                key={zoneId}
                                                                className={cn(
                                                                    "flex items-center gap-3 p-2 rounded-lg border",
                                                                    isExamined 
                                                                        ? "bg-emerald-500/10 border-emerald-500/30" 
                                                                        : "bg-muted/20 border-white/5"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "w-5 h-5 rounded-full flex items-center justify-center",
                                                                    isExamined ? "bg-emerald-500" : "bg-muted/50"
                                                                )}>
                                                                    {isExamined ? (
                                                                        <CheckCircle2 size={12} className="text-white" />
                                                                    ) : (
                                                                        <X size={12} className="text-muted-foreground" />
                                                                    )}
                                                                </div>
                                                                <span className={cn(
                                                                    "text-sm",
                                                                    isExamined ? "text-emerald-400" : "text-muted-foreground"
                                                                )}>
                                                                    {zone?.label || zoneId}
                                                                </span>
                                                                {isExamined && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 ml-auto">
                                                                        Examined
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Physical Checklist (AI-filled) */}
                                            <div className="bg-card border border-white/5 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-foreground text-sm">Physical Checklist</h3>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                                            AI Detected
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {physicalChecklistCompleted}/4 completed
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {EXAM_CHECKLIST_ITEMS.map((item) => {
                                                        const isChecked = aiPhysicalChecklist[item.id];
                                                        const IconComponent = item.icon;
                                                        return (
                                                            <div 
                                                                key={item.id}
                                                                className={cn(
                                                                    "flex items-center gap-2 p-2.5 rounded-lg border",
                                                                    isChecked 
                                                                        ? "bg-emerald-500/10 border-emerald-500/30" 
                                                                        : "bg-red-500/10 border-red-500/30"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "w-4 h-4 rounded-full flex items-center justify-center",
                                                                    isChecked ? "bg-emerald-500" : "bg-red-500/50"
                                                                )}>
                                                                    {isChecked ? (
                                                                        <CheckCircle2 size={10} className="text-white" />
                                                                    ) : (
                                                                        <X size={10} className="text-white" />
                                                                    )}
                                                                </div>
                                                                <IconComponent size={12} className={isChecked ? "text-emerald-400" : "text-red-400"} />
                                                                <span className={cn(
                                                                    "text-xs font-medium",
                                                                    isChecked ? "text-emerald-400" : "text-red-400"
                                                                )}>
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* OSCE Rubric (Physical) */}
                                            <div className="bg-card border border-white/5 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-foreground text-sm">OSCE Rubric (Physical)</h3>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                                            AI Scored
                                                        </span>
                                                    </div>
                                                    <span className={cn(
                                                        "text-xs px-2 py-1 rounded-full font-medium",
                                                        physicalRubricTotal >= 8 ? "bg-emerald-500/10 text-emerald-500" :
                                                        physicalRubricTotal >= 5 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                                                    )}>
                                                        {physicalRubricTotal}/10
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {PHYSICAL_RUBRIC_CRITERIA.map(criterion => {
                                                        const score = aiPhysicalRubric[criterion.key];
                                                        return (
                                                            <div 
                                                                key={criterion.key}
                                                                className={cn(
                                                                    "flex items-center justify-between p-2.5 rounded-lg border",
                                                                    score === 2 ? "bg-emerald-500/10 border-emerald-500/30" :
                                                                    score === 1 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30"
                                                                )}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className={cn(
                                                                        "text-sm font-medium",
                                                                        score === 2 ? "text-emerald-500" :
                                                                        score === 1 ? "text-amber-500" : "text-red-400"
                                                                    )}>{criterion.label}</span>
                                                                    <span className="text-[10px] text-muted-foreground">Auto-scored</span>
                                                                </div>
                                                                <span className={cn(
                                                                    "text-sm font-bold px-2 py-1 rounded",
                                                                    score === 2 ? "bg-emerald-500/20 text-emerald-400" :
                                                                    score === 1 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                                                                )}>
                                                                    {score}/2
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Key Physical Findings */}
                                            <div className="bg-card border border-white/5 rounded-xl p-4">
                                                <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                                                    <Stethoscope size={14} className="text-primary" />
                                                    Key Physical Findings
                                                </h3>
                                                {keyFindings.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {keyFindings.map((finding, idx) => (
                                                            <div key={idx} className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg">
                                                                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                                                <div>
                                                                    <span className="text-xs font-medium text-primary">{finding.zone}: </span>
                                                                    <span className="text-xs text-foreground">{finding.finding}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">No findings recorded.</p>
                                                )}
                                                {!coverageComplete && (
                                                    <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                                        <p className="text-xs text-amber-400 flex items-center gap-1.5">
                                                            <AlertTriangle size={12} />
                                                            Incomplete coverage: some required zones were not examined.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Score + Feedback */}
                                            <div className="bg-card border border-white/5 rounded-xl p-4">
                                                <h3 className="font-semibold text-foreground text-sm mb-3">Physical Exam Score</h3>
                                                <div className="flex items-center gap-4 mb-3">
                                                    <div className="flex-1 h-3 bg-muted/50 rounded-full overflow-hidden">
                                                        <div 
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                physicalScore >= 8 ? "bg-emerald-500" :
                                                                physicalScore >= 5 ? "bg-amber-500" : "bg-red-500"
                                                            )}
                                                            style={{ width: `${physicalScore * 10}%` }}
                                                        />
                                                    </div>
                                                    <span className={cn(
                                                        "text-lg font-bold",
                                                        physicalScore >= 8 ? "text-emerald-500" :
                                                        physicalScore >= 5 ? "text-amber-500" : "text-red-500"
                                                    )}>
                                                        {physicalScore}/10
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-muted/20 rounded-lg">
                                                    <p className="text-sm text-foreground">{getPhysicalFeedback()}</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* RIGHT COLUMN: Snapshot */}
                                <div className="hidden lg:flex flex-[2] flex-col gap-4 min-w-0">
                                    {/* Case Info */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                                            <Brain size={14} className="text-primary" />
                                            Session Snapshot
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">Case</span>
                                                <span className="text-xs font-medium text-foreground">{selectedCase?.title || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">Category</span>
                                                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                                    {selectedCase?.category || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">Session Time</span>
                                                <span className="text-xs font-medium text-foreground flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {formatTime(elapsedTime)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Current Vitals */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                                            <Activity size={14} className="text-primary" />
                                            Patient Vitals
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
                                            <div className={cn(
                                                "p-2 rounded-lg text-center",
                                                patientStatus.spO2 < 95 ? "bg-red-500/20" : "bg-muted/30"
                                            )}>
                                                <span className="text-[10px] text-muted-foreground block">SpO₂</span>
                                                <span className={cn(
                                                    "text-xs font-semibold",
                                                    patientStatus.spO2 < 95 ? "text-red-500" : "text-emerald-500"
                                                )}>{patientStatus.spO2}%</span>
                                            </div>
                                            <div className="p-2 bg-muted/30 rounded-lg text-center">
                                                <span className="text-[10px] text-muted-foreground block">RR</span>
                                                <span className="text-xs font-semibold text-foreground">{patientStatus.respiratoryRate}/m</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Exam Log Summary */}
                                    <div className="flex-1 bg-card border border-white/5 rounded-xl p-4 overflow-hidden flex flex-col">
                                        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm flex-shrink-0">
                                            <FileText size={14} className="text-primary" />
                                            Exam Log ({examLog.length} zones)
                                        </h3>
                                        <div className="flex-1 overflow-y-auto space-y-1.5">
                                            {examLog.length === 0 ? (
                                                <p className="text-xs text-muted-foreground/50 italic text-center py-4">
                                                    No zones examined
                                                </p>
                                            ) : (
                                                examLog.slice(0, 6).map((entry, idx) => (
                                                    <div 
                                                        key={idx}
                                                        className="p-2 bg-muted/20 rounded-lg border border-white/5"
                                                    >
                                                        <span className="text-xs font-medium text-foreground">{entry.zone}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex-shrink-0 border-t border-white/5 bg-card/50 px-6 py-4 flex items-center justify-between">
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
                            <p className="text-sm text-muted-foreground mb-8">
                                Your practice session has been recorded successfully.
                            </p>
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
