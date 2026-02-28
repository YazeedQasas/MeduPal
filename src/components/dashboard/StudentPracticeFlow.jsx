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
    ListChecks
} from 'lucide-react';
import { cn } from '../../lib/utils';

const STEPS = [
    { id: 0, label: 'Case Selection', icon: Brain },
    { id: 1, label: 'History Taking', icon: MessageCircle },
    { id: 2, label: 'History Evaluation', icon: CheckCircle2 },
    { id: 3, label: 'Physical Exam', icon: Stethoscope },
    { id: 4, label: 'Physical Evaluation', icon: ListChecks }
];

const MEDUPAL_CASES = [
    { id: 'pneumonia', title: 'Pneumonia', category: 'Respiratory' },
    { id: 'aortic-stenosis', title: 'Aortic Stenosis', category: 'Cardiac' },
    { id: 'mitral-stenosis', title: 'Mitral Stenosis', category: 'Cardiac' },
    { id: 'asthma', title: 'Asthma', category: 'Respiratory' },
    { id: 'copd', title: 'COPD', category: 'Respiratory' }
];

const INITIAL_VITALS = {
    age: '45 years',
    weight: '78 kg',
    temperature: '37.8°C',
    heartRate: '88 bpm',
    spO2: 97,
    respiratoryRate: 18
};

const CASE_SYMPTOMS = {
    'pneumonia': ['Cough', 'Fever', 'Pleuritic chest pain', 'Shortness of breath', 'Fatigue', 'Yellow sputum'],
    'aortic-stenosis': ['Exertional dyspnea', 'Fatigue', 'Chest pain', 'Dizziness', 'Syncope'],
    'mitral-stenosis': ['Exertional dyspnea', 'Fatigue', 'Palpitations', 'Hemoptysis', 'Chest discomfort'],
    'asthma': ['Wheeze', 'Dyspnea', 'Chest tightness', 'Cough', 'Nocturnal symptoms'],
    'copd': ['Wheeze', 'Chronic cough', 'Dyspnea', 'Chest tightness', 'Sputum production', 'Fatigue']
};

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

function StudentPracticeFlow({ onExit }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedCase, setSelectedCase] = useState(null);
    const [messages, setMessages] = useState([
        {
            role: 'system',
            content: 'You are now with the patient. Begin by introducing yourself and asking about their symptoms.'
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [patientStatus, setPatientStatus] = useState(INITIAL_VITALS);
    const [isDeteriorating, setIsDeteriorating] = useState(false);
    const [hasDeteriorated, setHasDeteriorated] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [lastTranscript, setLastTranscript] = useState('');
    
    // Evaluation step states
    const [redFlagRecognized, setRedFlagRecognized] = useState(false);
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
    
    // Completion screen states
    const [showCompletionScreen, setShowCompletionScreen] = useState(false);
    const [countdown, setCountdown] = useState(10);

    const chatEndRef = useRef(null);
    const countdownRef = useRef(null);
    const timerRef = useRef(null);
    const deteriorationTimeoutRef = useRef(null);
    const recognitionRef = useRef(null);
    const mockRecordingTimeoutRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (currentStep === 1) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
            
            if (!hasDeteriorated) {
                deteriorationTimeoutRef.current = setTimeout(() => {
                    triggerAutoDeteriorationInternal();
                }, 60000);
            }
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (deteriorationTimeoutRef.current) {
                clearTimeout(deteriorationTimeoutRef.current);
            }
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (deteriorationTimeoutRef.current) {
                clearTimeout(deteriorationTimeoutRef.current);
            }
        };
    }, [currentStep, hasDeteriorated]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAICaseSelect = () => {
        if (isSelecting) return;
        setIsSelecting(true);
        
        setTimeout(() => {
            const randomCase = MEDUPAL_CASES[Math.floor(Math.random() * MEDUPAL_CASES.length)];
            setSelectedCase(randomCase);
            setTimeout(() => setCurrentStep(1), 600);
        }, 400);
    };

    const getPatientReply = useCallback(() => {
        const caseId = selectedCase?.id || 'pneumonia';
        const replies = CASE_PATIENT_REPLIES[caseId] || CASE_PATIENT_REPLIES['pneumonia'];
        return replies[Math.floor(Math.random() * replies.length)];
    }, [selectedCase]);

    const speakText = useCallback((text) => {
        if (!voiceEnabled || typeof window === 'undefined') return;
        
        window.speechSynthesis.cancel();
        setIsSpeaking(true);
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        utterance.onend = () => {
            setIsSpeaking(false);
        };
        
        utterance.onerror = () => {
            setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(utterance);
    }, [voiceEnabled]);

    const handleSendMessage = useCallback(() => {
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

        setTimeout(() => {
            const patientResponse = getPatientReply();
            setMessages(prev => [...prev, { 
                role: 'patient', 
                content: patientResponse,
                ts: Date.now()
            }]);
            setIsTyping(false);
            speakText(patientResponse);
        }, 500);
    }, [inputValue, isTyping, getPatientReply, speakText]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const getMockTranscript = useCallback(() => {
        const caseId = selectedCase?.id || 'pneumonia';
        const mockTranscripts = {
            'pneumonia': ["Can you describe your chest pain?", "When did your cough start?", "Do you have any fever?"],
            'aortic-stenosis': ["Do you feel dizzy when standing?", "Does your chest hurt during exercise?", "Have you fainted recently?"],
            'mitral-stenosis': ["Do you feel your heart racing?", "Have you coughed up any blood?", "Do you get tired easily?"],
            'asthma': ["What triggers your breathing problems?", "Do you wheeze at night?", "Does your chest feel tight?"],
            'copd': ["How long have you been coughing?", "Do you smoke or have you smoked?", "Do you produce sputum when coughing?"]
        };
        const transcripts = mockTranscripts[caseId] || mockTranscripts['pneumonia'];
        return transcripts[Math.floor(Math.random() * transcripts.length)];
    }, [selectedCase]);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            setIsRecording(false);
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch {}
            }
            if (mockRecordingTimeoutRef.current) {
                clearTimeout(mockRecordingTimeoutRef.current);
            }
            return;
        }

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
    }, [isRecording, getMockTranscript]);

    // Cleanup speech recognition and synthesis on unmount
    useEffect(() => {
        return () => {
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

    const handleFinishSession = useCallback(() => {
        setShowCompletionScreen(true);
    }, []);

    const handleReturnNow = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }
        onExit();
    }, [onExit]);

    // Physical Exam handlers
    const handleZoneClick = useCallback((zone) => {
        setSelectedZone(zone);
        
        const caseId = selectedCase?.id || 'pneumonia';
        const findings = ZONE_FINDINGS[caseId] || ZONE_FINDINGS['pneumonia'];
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
    }, [selectedCase]);

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
        
        const alertMessage = { 
            role: 'alert', 
            content: 'Patient condition worsening! SpO₂ dropping rapidly.' 
        };
        setMessages(prev => [...prev, alertMessage]);
    };

    const triggerDeterioration = () => {
        if (hasDeteriorated) return;
        triggerAutoDeteriorationInternal();
    };

    const goNext = () => {
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
            <div className="bg-card/50 border-b border-white/5 px-6 py-3 flex-shrink-0">
                <div className="flex items-center justify-center gap-2 max-w-3xl mx-auto">
                    {STEPS.map((step, index) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        const StepIcon = step.icon;

                        return (
                            <React.Fragment key={step.id}>
                                <div
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                                        isActive && "bg-primary/10 text-primary border border-primary/20",
                                        isCompleted && "text-emerald-500",
                                        !isActive && !isCompleted && "text-muted-foreground opacity-50"
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 size={16} />
                                    ) : (
                                        <StepIcon size={16} />
                                    )}
                                    <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div className={cn(
                                        "w-6 h-0.5 rounded-full",
                                        isCompleted ? "bg-emerald-500" : "bg-white/10"
                                    )} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {/* Step 0: AI Case Selection */}
                {currentStep === 0 && (
                    <div className="h-full flex items-center justify-center p-6">
                        <div className="text-center max-w-md">
                            <div className={cn(
                                "w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 transition-all",
                                isSelecting && "animate-pulse"
                            )}>
                                <Brain size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">AI Case Selection</h2>
                            <p className="text-muted-foreground mb-8">
                                Let our AI choose an appropriate clinical case for your practice session based on your learning progress.
                            </p>
                            
                            {!selectedCase ? (
                                <button
                                    onClick={handleAICaseSelect}
                                    disabled={isSelecting}
                                    className={cn(
                                        "px-8 py-4 rounded-xl text-lg font-medium bg-primary text-primary-foreground transition-all shadow-lg shadow-primary/20",
                                        isSelecting 
                                            ? "opacity-70 cursor-wait" 
                                            : "hover:bg-primary/90 hover:scale-105"
                                    )}
                                >
                                    {isSelecting ? 'AI is thinking...' : 'Let AI Choose Case'}
                                </button>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
                                        <p className="text-emerald-500 text-sm font-medium mb-2">AI selected:</p>
                                        <h3 className="text-xl font-bold text-foreground">{selectedCase.title}</h3>
                                        <span className={cn(
                                            "inline-block mt-2 text-xs px-2 py-1 rounded-full font-medium",
                                            selectedCase.category === 'Cardiac' 
                                                ? "bg-red-500/10 text-red-400" 
                                                : "bg-blue-500/10 text-blue-400"
                                        )}>
                                            {selectedCase.category}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground text-sm">Starting session...</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 1: History Taking */}
                {currentStep === 1 && (
                    <div className="h-full flex flex-col">
                        {/* Alert Banner */}
                        {isDeteriorating && (
                            <div className="bg-red-500/20 border-b border-red-500/30 px-6 py-3 flex items-center justify-center gap-3 animate-pulse flex-shrink-0">
                                <AlertTriangle className="text-red-500" size={20} />
                                <span className="text-red-500 font-semibold">
                                    SpO₂ dropping — patient worsening!
                                </span>
                            </div>
                        )}

                        {/* Main Two-Column Layout */}
                        <div className="flex-1 flex overflow-hidden p-4 gap-4">
                            {/* LEFT COLUMN: Patient Avatar + Conversation (60-65%) */}
                            <div className="flex-[3] flex flex-col bg-card border border-white/5 rounded-xl overflow-hidden min-w-0">
                                {/* Header */}
                                <div className="bg-muted/30 border-b border-white/5 px-4 py-3 flex items-center justify-between flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <MessageCircle size={16} className="text-primary" />
                                        <span className="font-semibold text-foreground text-sm">Patient Conversation</span>
                                    </div>
                                    <button
                                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                                            voiceEnabled 
                                                ? "bg-primary/10 text-primary" 
                                                : "bg-muted/50 text-muted-foreground"
                                        )}
                                        title={voiceEnabled ? "Disable voice replies" : "Enable voice replies"}
                                    >
                                        {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                                        Voice {voiceEnabled ? 'On' : 'Off'}
                                    </button>
                                </div>

                                {/* Content Area: Manikin + Chat */}
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Static Manikin Avatar Panel */}
                                    <div className="w-32 flex-shrink-0 border-r border-white/5 flex flex-col items-center justify-start p-4 bg-muted/20">
                                        {/* Manikin Image */}
                                        <div className="relative">
                                            {/* Speaking indicator ring */}
                                            {isSpeaking && (
                                                <div 
                                                    className="absolute -inset-2 rounded-2xl animate-pulse"
                                                    style={{
                                                        background: 'radial-gradient(circle, rgba(52, 211, 153, 0.3) 0%, transparent 70%)'
                                                    }}
                                                />
                                            )}
                                            <div
                                                className={cn(
                                                    "w-20 h-20 rounded-2xl border flex items-center justify-center mb-3 transition-all",
                                                    isSpeaking ? "border-emerald-500/50" : "border-white/10"
                                                )}
                                                style={{
                                                    background: `
                                                        radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 40%),
                                                        linear-gradient(145deg, #5a7d8a 0%, #3d5a6a 50%, #2a4050 100%)
                                                    `,
                                                    boxShadow: isSpeaking 
                                                        ? '0 4px 20px rgba(52, 211, 153, 0.3), inset 0 -2px 10px rgba(0,0,0,0.2), inset 0 2px 10px rgba(255,255,255,0.05)'
                                                        : '0 4px 20px rgba(0,0,0,0.3), inset 0 -2px 10px rgba(0,0,0,0.2), inset 0 2px 10px rgba(255,255,255,0.05)'
                                                }}
                                            >
                                                {/* Simple Face */}
                                                <div className="flex flex-col items-center">
                                                    <div className="flex gap-4 mb-2">
                                                        <div 
                                                            className={cn(
                                                                "w-2.5 h-2.5 rounded-full transition-colors",
                                                                isSpeaking ? "bg-emerald-400/80" : "bg-slate-300/60"
                                                            )} 
                                                            style={{ boxShadow: isSpeaking ? '0 0 6px rgba(52, 211, 153, 0.5)' : 'inset 0 1px 2px rgba(0,0,0,0.3)' }} 
                                                        />
                                                        <div 
                                                            className={cn(
                                                                "w-2.5 h-2.5 rounded-full transition-colors",
                                                                isSpeaking ? "bg-emerald-400/80" : "bg-slate-300/60"
                                                            )} 
                                                            style={{ boxShadow: isSpeaking ? '0 0 6px rgba(52, 211, 153, 0.5)' : 'inset 0 1px 2px rgba(0,0,0,0.3)' }} 
                                                        />
                                                    </div>
                                                    {/* Mouth - animated when speaking */}
                                                    <div 
                                                        className={cn(
                                                            "rounded-full bg-slate-400/50 transition-all",
                                                            isSpeaking ? "w-4 h-3" : "w-5 h-1.5"
                                                        )} 
                                                        style={{ 
                                                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
                                                            animation: isSpeaking ? 'mouthMove 300ms ease-in-out infinite' : 'none'
                                                        }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground font-medium">Patient</span>
                                        {isSpeaking ? (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Volume2 size={10} className="text-emerald-500" />
                                                <span className="text-[10px] text-emerald-500 font-medium">Speaking...</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground/60 mt-0.5">Virtual Manikin</span>
                                        )}
                                        
                                        {/* Wave Animation when speaking */}
                                        {isSpeaking && (
                                            <div className="flex items-end gap-0.5 h-4 mt-2">
                                                {[0, 1, 2, 3, 4].map((i) => (
                                                    <div
                                                        key={i}
                                                        className="w-1 bg-emerald-500 rounded-full"
                                                        style={{
                                                            animation: 'waveBar 600ms ease-in-out infinite',
                                                            animationDelay: `${i * 100}ms`,
                                                            height: '6px'
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* CSS Animations for speaking */}
                                    <style>{`
                                        @keyframes waveBar {
                                            0%, 100% { height: 6px; }
                                            50% { height: 14px; }
                                        }
                                        @keyframes mouthMove {
                                            0%, 100% { height: 6px; width: 16px; }
                                            50% { height: 12px; width: 14px; }
                                        }
                                    `}</style>

                                    {/* Chat Messages */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                            {messages.map((msg, idx) => (
                                                <div
                                                    key={idx}
                                                    className={cn(
                                                        "flex",
                                                        msg.role === 'student' ? "justify-end" : "justify-start",
                                                        msg.role === 'alert' && "justify-center"
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm",
                                                            msg.role === 'student' && "bg-primary text-primary-foreground rounded-br-md",
                                                            msg.role === 'patient' && "bg-muted/50 text-foreground border border-white/5 rounded-bl-md",
                                                            msg.role === 'system' && "bg-amber-500/10 text-amber-500 border border-amber-500/20 text-center mx-auto rounded-xl text-xs",
                                                            msg.role === 'alert' && "bg-red-500/20 text-red-500 border border-red-500/30 text-center rounded-xl font-medium"
                                                        )}
                                                    >
                                                        {msg.role === 'patient' && (
                                                            <span className="text-xs text-muted-foreground font-medium block mb-1">Patient</span>
                                                        )}
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                            {isTyping && (
                                                <div className="flex justify-start">
                                                    <div className="bg-muted/50 border border-white/5 px-4 py-2.5 rounded-2xl rounded-bl-md">
                                                        <span className="text-xs text-muted-foreground font-medium block mb-1">Patient</span>
                                                        <div className="flex gap-1">
                                                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>

                                        {/* Last Transcript Display */}
                                        {lastTranscript && !isRecording && (
                                            <div className="border-t border-white/5 px-3 py-2 bg-muted/20 flex-shrink-0">
                                                <div className="text-[10px] text-muted-foreground mb-1 font-medium">Last transcript:</div>
                                                <div className="text-xs text-foreground/80 italic">&quot;{lastTranscript}&quot;</div>
                                            </div>
                                        )}

                                        {/* Input Area */}
                                        <div className="border-t border-white/5 p-3 flex-shrink-0">
                                            {/* Recording indicator */}
                                            {isRecording && (
                                                <div className="flex items-center justify-center gap-2 text-red-500 text-sm mb-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                                                    <span className="font-medium">Listening...</span>
                                                    <span className="text-xs text-red-400/80">Speak now</span>
                                                </div>
                                            )}
                                            
                                            <div className="flex gap-2">
                                                <div className={cn(
                                                    "flex-1 flex gap-2 border rounded-xl px-3 transition-colors",
                                                    isRecording 
                                                        ? "bg-red-500/5 border-red-500/30" 
                                                        : "bg-muted/50 border-white/5"
                                                )}>
                                                    <input
                                                        type="text"
                                                        placeholder={isRecording ? "Listening..." : "Ask the patient a question..."}
                                                        className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none"
                                                        value={inputValue}
                                                        onChange={(e) => setInputValue(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                        disabled={isTyping || isRecording || isSpeaking}
                                                    />
                                                    <button
                                                        onClick={toggleRecording}
                                                        disabled={isTyping || isSpeaking}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-colors",
                                                            isRecording 
                                                                ? "text-red-500 bg-red-500/10 animate-pulse" 
                                                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                                        )}
                                                        title={isRecording ? "Stop recording" : "Start voice input"}
                                                    >
                                                        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={handleSendMessage}
                                                    disabled={!inputValue.trim() || isTyping || isSpeaking}
                                                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Send size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Patient Status + Timer + Hint (35-40%) */}
                            <div className="hidden lg:flex flex-[2] flex-col gap-4 min-w-0">
                                {/* TOP: Patient Status Card (Largest) */}
                                <div className="flex-1 bg-card border border-white/5 rounded-xl p-4 overflow-y-auto">
                                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Activity size={16} className="text-primary" />
                                        Patient Status
                                    </h3>
                                    
                                    {/* Vitals Grid */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="p-2 bg-muted/30 rounded-lg text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Thermometer size={10} />
                                                <span className="text-[10px]">Temp</span>
                                            </div>
                                            <span className="text-xs font-semibold text-amber-500">{patientStatus.temperature}</span>
                                        </div>
                                        <div className="p-2 bg-muted/30 rounded-lg text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <User size={10} />
                                                <span className="text-[10px]">Age</span>
                                            </div>
                                            <span className="text-xs font-semibold text-foreground">{patientStatus.age}</span>
                                        </div>
                                        <div className="p-2 bg-muted/30 rounded-lg text-center">
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Scale size={10} />
                                                <span className="text-[10px]">Wt</span>
                                            </div>
                                            <span className="text-xs font-semibold text-foreground">{patientStatus.weight}</span>
                                        </div>
                                        <div className={cn(
                                            "p-2 rounded-lg text-center transition-colors",
                                            isDeteriorating ? "bg-red-500/20" : "bg-muted/30"
                                        )}>
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Heart size={10} />
                                                <span className="text-[10px]">HR</span>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-semibold",
                                                isDeteriorating ? "text-red-500" : "text-foreground"
                                            )}>{patientStatus.heartRate}</span>
                                        </div>
                                        <div className={cn(
                                            "p-2 rounded-lg text-center transition-colors",
                                            isDeteriorating ? "bg-red-500/20 animate-pulse" : "bg-muted/30"
                                        )}>
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Activity size={10} />
                                                <span className="text-[10px]">SpO₂</span>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-semibold",
                                                isDeteriorating ? "text-red-500" : patientStatus.spO2 < 95 ? "text-amber-500" : "text-emerald-500"
                                            )}>{patientStatus.spO2}%</span>
                                        </div>
                                        <div className={cn(
                                            "p-2 rounded-lg text-center transition-colors",
                                            isDeteriorating ? "bg-red-500/20 animate-pulse" : "bg-muted/30"
                                        )}>
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                                <Wind size={10} />
                                                <span className="text-[10px]">RR</span>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-semibold",
                                                isDeteriorating ? "text-red-500" : "text-foreground"
                                            )}>{patientStatus.respiratoryRate}/m</span>
                                        </div>
                                    </div>

                                    {/* Symptoms */}
                                    <div>
                                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Reported Symptoms</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(selectedCase ? CASE_SYMPTOMS[selectedCase.id] || [] : []).map((symptom, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] rounded-full font-medium"
                                                >
                                                    {symptom}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* MIDDLE ROW: Timer + Hint */}
                                <div className="flex gap-4 flex-shrink-0">
                                    {/* Timer Card */}
                                    <div className="flex-1 bg-card border border-white/5 rounded-xl p-4 text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                                            <Clock size={14} />
                                            <span className="text-xs font-medium">Timer</span>
                                        </div>
                                        <span className="text-2xl font-bold text-foreground font-mono">{formatTime(elapsedTime)}</span>
                                    </div>

                                    {/* Hint Toggle */}
                                    <div className="flex-1 bg-card border border-white/5 rounded-xl p-3 flex flex-col">
                                        {showHint ? (
                                            <>
                                                <button
                                                    onClick={() => setShowHint(false)}
                                                    className="flex items-center gap-1.5 text-primary mb-1 hover:opacity-80 transition-opacity"
                                                >
                                                    <Brain size={12} />
                                                    <span className="text-[10px] font-semibold">Hide Hint</span>
                                                </button>
                                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                    Ask about duration, severity, triggers, and past history.
                                                </p>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setShowHint(true)}
                                                className="flex-1 flex items-center justify-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <Brain size={14} />
                                                <span className="text-xs font-medium">Show Hint</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Demo Trigger (small) */}
                                {!hasDeteriorated && (
                                    <button
                                        onClick={triggerDeterioration}
                                        className="flex-shrink-0 py-2 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <AlertTriangle size={12} />
                                        Trigger Deterioration (Demo)
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Bottom Action Button */}
                        <div className="flex-shrink-0 p-4 pt-0 flex justify-end">
                            <button
                                onClick={goNext}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200"
                            >
                                Proceed to Evaluation
                                <ChevronRight size={18} />
                            </button>
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
                        const caseId = selectedCase?.id || 'pneumonia';
                        const findings = {
                            'pneumonia': ['Fever present', 'Productive cough with yellow sputum', 'Pleuritic chest pain', 'Shortness of breath on exertion'],
                            'aortic-stenosis': ['Exertional chest pain', 'Syncope/near-syncope episodes', 'Exertional dyspnea', 'Reduced exercise tolerance'],
                            'mitral-stenosis': ['Palpitations reported', 'Hemoptysis (pink-tinged sputum)', 'Orthopnea', 'Fatigue with minimal exertion'],
                            'asthma': ['Nocturnal symptoms', 'Wheeze on triggers (cold, dust)', 'Chest tightness', 'Known allergies (cats, pollen)'],
                            'copd': ['30-year smoking history', 'Chronic productive cough', 'Progressive dyspnea', 'Reduced exercise capacity']
                        };
                        const base = findings[caseId] || findings['pneumonia'];
                        if (hasDeteriorated) {
                            return [...base, 'SpO₂ deterioration observed (dropped to 88%)'];
                        }
                        return base;
                    };

                    const calculateScore = () => {
                        let score = 0;
                        // Checklist: 2.5 points max (0.5 per item)
                        score += checklistCompleted * 0.5;
                        // Red flag: 1.5 points if deterioration happened and recognized
                        if (hasDeteriorated && redFlagRecognized) score += 1.5;
                        // Diagnosis match: 1.5 points
                        if (selectedDiagnosis === selectedCase?.id) score += 1.5;
                        // Rubric: 4.5 points max (rubricTotal/10 * 4.5)
                        score += (rubricTotal / 10) * 4.5;
                        return Math.min(10, Math.round(score * 10) / 10);
                    };

                    const getFeedback = () => {
                        const score = calculateScore();
                        if (hasDeteriorated && !redFlagRecognized) {
                            return "Important: You missed the SpO₂ deterioration. Always monitor vitals closely!";
                        }
                        if (score >= 8) return "Excellent history taking! You covered all key areas systematically.";
                        if (score >= 6) return "Good history structure. Consider being more thorough with social history.";
                        if (score >= 4) return "Adequate attempt. Remember to always check allergies and medications.";
                        return "Keep practicing. Try to cover all OSCE checklist items systematically.";
                    };

                    const copyEvaluationSummary = async () => {
                        const keyFindings = getKeyFindings();
                        const diagnosisName = MEDUPAL_CASES.find(c => c.id === selectedDiagnosis)?.title || 'Not selected';
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

RED FLAG RECOGNITION: ${hasDeteriorated ? (redFlagRecognized ? 'Yes - Recognized SpO₂ drop' : 'No - Missed SpO₂ drop!') : 'N/A (no deterioration)'}

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

                                    {/* Red Flag Recognition */}
                                    <div className="bg-card border border-white/5 rounded-xl p-4">
                                        <h3 className="font-semibold text-foreground text-sm mb-3">Red Flag Recognition</h3>
                                        <label className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                            redFlagRecognized
                                                ? "bg-red-500/10 border-red-500/30"
                                                : "bg-muted/30 border-white/5 hover:border-white/10"
                                        )}>
                                            <input
                                                type="checkbox"
                                                checked={redFlagRecognized}
                                                onChange={(e) => setRedFlagRecognized(e.target.checked)}
                                                className="w-4 h-4 rounded border-white/20 bg-muted/50 text-red-500 focus:ring-red-500/30"
                                            />
                                            <span className={cn(
                                                "text-sm",
                                                redFlagRecognized ? "text-red-400" : "text-foreground"
                                            )}>
                                                I noticed the patient deterioration (SpO₂ drop)
                                            </span>
                                        </label>
                                        {hasDeteriorated && !redFlagRecognized && (
                                            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                                                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-amber-500">
                                                    The patient's SpO₂ dropped during your session. Always watch for deterioration signs!
                                                </p>
                                            </div>
                                        )}
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
                                                    {MEDUPAL_CASES.map(c => (
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
                                                    {(missedQuestions[selectedCase?.id] || missedQuestions['pneumonia']).map((q, idx) => (
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
                                                <span className={cn(
                                                    "text-xs font-semibold",
                                                    isDeteriorating ? "text-red-500" : "text-foreground"
                                                )}>{patientStatus.heartRate}</span>
                                            </div>
                                            <div className={cn(
                                                "p-2 rounded-lg text-center",
                                                isDeteriorating ? "bg-red-500/20" : "bg-muted/30"
                                            )}>
                                                <span className="text-[10px] text-muted-foreground block">SpO₂</span>
                                                <span className={cn(
                                                    "text-xs font-semibold",
                                                    isDeteriorating ? "text-red-500" : patientStatus.spO2 < 95 ? "text-amber-500" : "text-emerald-500"
                                                )}>{patientStatus.spO2}%</span>
                                            </div>
                                            <div className={cn(
                                                "p-2 rounded-lg text-center",
                                                isDeteriorating ? "bg-red-500/20" : "bg-muted/30"
                                            )}>
                                                <span className="text-[10px] text-muted-foreground block">RR</span>
                                                <span className={cn(
                                                    "text-xs font-semibold",
                                                    isDeteriorating ? "text-red-500" : "text-foreground"
                                                )}>{patientStatus.respiratoryRate}/m</span>
                                            </div>
                                        </div>
                                        {isDeteriorating && (
                                            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                <p className="text-[10px] text-red-400 text-center font-medium">
                                                    Patient deteriorated during session
                                                </p>
                                            </div>
                                        )}
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
                    const caseId = selectedCase?.id || 'pneumonia';
                    const requirements = REQUIRED_ZONES_BY_CASE[caseId] || REQUIRED_ZONES_BY_CASE['pneumonia'];
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
                            const lungFindings = ZONE_FINDINGS[caseId]?.lung || 'Normal breath sounds';
                            findings.push({ zone: 'Lung fields', finding: lungFindings });
                        }
                        if (hasCardiacZones) {
                            const cardiacFindings = ZONE_FINDINGS[caseId]?.cardiac || 'Normal heart sounds';
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
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                                >
                                    Finish Practice Session
                                    <ChevronRight size={16} />
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
                                Thank you for using MeduPal
                            </p>
                            
                            {/* Description */}
                            <p className="text-sm text-muted-foreground mb-8">
                                Your practice session has been recorded successfully.
                            </p>
                            
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
