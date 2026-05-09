import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search,
    ChevronDown,
    Heart,
    Wind,
    Layers,
    FolderOpen,
    Check,
    BookOpen,
    ClipboardList,
    Send,
    Sparkles,
    SlidersHorizontal,
    FileSearch,
    Inbox,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CreateCaseForm } from './CreateCaseForm';
import { DASHBOARD_THEME } from './DashboardShell';

/** Match InstructorDashboard cards */
const CARD_SURFACE = {
    background: 'hsl(var(--card))',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
};

/** Per-category color + icon for tabs, rows, and section headers */
const CATEGORY_UI = {
    all: {
        Icon: Layers,
        tabActive: 'text-sky-300 bg-sky-500/15 border-sky-400/30 shadow-[0_0_20px_-8px_rgba(56,189,248,0.5)]',
        tabIdle: 'text-zinc-400 hover:text-sky-200 hover:bg-sky-500/10 hover:border-sky-500/20 border border-transparent',
        rowBar: 'bg-gradient-to-b from-sky-400 to-sky-600',
        chip: 'bg-sky-500/20 text-sky-300 border-sky-400/25',
    },
    cardiology: {
        Icon: Heart,
        tabActive: 'text-rose-300 bg-rose-500/15 border-rose-400/30 shadow-[0_0_20px_-8px_rgba(244,63,94,0.45)]',
        tabIdle: 'text-zinc-400 hover:text-rose-200 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent',
        rowBar: 'bg-gradient-to-b from-rose-400 to-pink-600',
        chip: 'bg-rose-500/20 text-rose-300 border-rose-400/25',
    },
    respiratory: {
        Icon: Wind,
        tabActive: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/30 shadow-[0_0_20px_-8px_rgba(34,211,238,0.45)]',
        tabIdle: 'text-zinc-400 hover:text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent',
        rowBar: 'bg-gradient-to-b from-cyan-400 to-teal-600',
        chip: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/25',
    },
    other: {
        Icon: FolderOpen,
        tabActive: 'text-violet-300 bg-violet-500/15 border-violet-400/30 shadow-[0_0_20px_-8px_rgba(167,139,250,0.45)]',
        tabIdle: 'text-zinc-400 hover:text-violet-200 hover:bg-violet-500/10 hover:border-violet-500/20 border border-transparent',
        rowBar: 'bg-gradient-to-b from-violet-400 to-indigo-600',
        chip: 'bg-violet-500/20 text-violet-300 border-violet-400/25',
    },
};

function isCardiologyCase(c) {
    return (c.category || '').toLowerCase().includes('cardio');
}

function isRespiratoryCase(c) {
    const category = (c.category || '').toLowerCase();
    return category.includes('resp') || category.includes('repo');
}

function getCaseCategoryKey(caseItem) {
    if (isCardiologyCase(caseItem)) return 'cardiology';
    if (isRespiratoryCase(caseItem)) return 'respiratory';
    return 'other';
}

const caseDescriptions = {
    'Mitral Stenosis': 'A patient presents with fatigue and shortness of breath. Assess for signs of mitral valve narrowing and related complications.',
    'Aortic Stenosis': 'Elderly patient with chest pain and syncope. Evaluate for aortic valve obstruction and hemodynamic impact.',
    'COPD': 'Chronic smoker with progressive dyspnea. Assess respiratory function and identify signs of airflow limitation.',
    'Asthma': 'Young patient with episodic wheezing and shortness of breath. Evaluate triggers and airway responsiveness.',
    'Pneumonia': 'Patient with fever, cough, and chest discomfort. Assess for lung infection and appropriate clinical findings.',
};

const casePreview = {
    'Respiratory Exam': {
        intro: "This station assesses the student's ability to perform a structured respiratory examination in a clinical setting.",
        sections: [
            {
                title: 'Introduction',
                description: 'The student is expected to introduce themselves, ensure infection control, check patient comfort, and obtain consent before starting the examination.',
            },
            {
                title: 'Initial Assessment',
                description: 'The student observes the patient from a distance, identifying any visible signs of respiratory distress or relevant equipment such as inhalers.',
            },
            {
                title: 'Peripheral Examination',
                description: 'Basic clinical checks including hands, pulse, lymph nodes, and vital signs to identify systemic signs related to respiratory disease.',
            },
            {
                title: 'Chest Examination',
                description: 'Includes inspection, palpation, percussion, and auscultation of the chest, assessing for abnormalities in breathing and lung function.',
            },
            {
                title: 'Completion',
                description: 'The student concludes the examination professionally, ensures patient comfort, and summarizes findings appropriately.',
            },
            {
                title: 'Clinical Reasoning',
                description: 'The student is expected to suggest possible diagnoses and request appropriate investigations based on findings.',
            },
        ],
    },
    'Mitral Stenosis': {
        intro: 'This station focuses on valvular heart disease presentation and cardiovascular examination in the context of mitral stenosis.',
        sections: [
            {
                title: 'Introduction',
                description: 'The student introduces themselves, confirms identity, explains the purpose of the encounter, and obtains consent to examine.',
            },
            {
                title: 'Examination',
                description: 'The student performs a focused cardiovascular assessment—inspection, palpation, and auscultation—with attention to murmurs, rhythm, and signs of congestion.',
            },
            {
                title: 'Completion',
                description: 'The student summarizes relevant findings, outlines a sensible differential, and suggests appropriate next steps such as investigations or referral.',
            },
        ],
    },
    'Aortic Stenosis': {
        intro: 'This station addresses aortic valve disease and the assessment of a patient with possible hemodynamically significant stenosis.',
        sections: [
            {
                title: 'Introduction',
                description: 'The student establishes rapport, checks comfort, and sets expectations for a focused cardiovascular assessment.',
            },
            {
                title: 'Examination',
                description: 'The student examines pulses, precordium, and heart sounds, correlating findings with symptoms such as exertional chest pain or syncope.',
            },
            {
                title: 'Completion',
                description: 'The student communicates findings clearly, highlights red-flag features, and discusses further evaluation or escalation.',
            },
        ],
    },
    COPD: {
        intro: 'This station covers chronic obstructive pulmonary disease and structured respiratory assessment.',
        sections: [
            {
                title: 'Introduction',
                description: 'The student introduces themselves, ensures infection control where appropriate, and obtains consent before examination.',
            },
            {
                title: 'Examination',
                description: 'The student inspects for respiratory distress, palpates and percusses as indicated, and auscultates for airflow limitation and added sounds.',
            },
            {
                title: 'Completion',
                description: 'The student summarizes findings, links them to COPD where appropriate, and outlines sensible management themes.',
            },
        ],
    },
    Asthma: {
        intro: 'This station assesses recognition and assessment of asthma-related respiratory presentation.',
        sections: [
            {
                title: 'Introduction',
                description: 'The student opens the encounter professionally and explores trigger history and current symptoms.',
            },
            {
                title: 'Examination',
                description: 'The student assesses work of breathing, auscultates the chest, and considers severity of acute or chronic limitation.',
            },
            {
                title: 'Completion',
                description: 'The student summarizes the picture, discusses acute versus maintenance themes, and safety-netting where relevant.',
            },
        ],
    },
    Pneumonia: {
        intro: 'This station focuses on acute respiratory infection and clinical assessment of possible pneumonia.',
        sections: [
            {
                title: 'Introduction',
                description: 'The student takes a focused history of onset, systemic symptoms, and risk factors.',
            },
            {
                title: 'Examination',
                description: 'The student examines vital signs and the chest, looking for focal signs and severity markers.',
            },
            {
                title: 'Completion',
                description: 'The student synthesizes findings, considers diagnosis and severity, and outlines investigations and initial management direction.',
            },
        ],
    },
};

export function Cases() {
    const { role } = useAuth();
    const canCreateCases = role === 'admin' || role === 'technician';
    const [searchTerm, setSearchTerm] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState('Any Difficulty');
    const [cases, setCases] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    /** all | cardiology | respiratory | other */
    const [systemTab, setSystemTab] = useState('all');
    const [selectedCaseIds, setSelectedCaseIds] = useState([]);
    const [favoriteCaseIds, setFavoriteCaseIds] = useState([]);
    const [expandedCaseId, setExpandedCaseId] = useState(null);

    const fetchCases = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('cases')
            .select(`
                *,
                author:profiles(full_name)
            `)
            .order('created_at', { ascending: false });

        if (role === 'student') {
            query = query.eq('status', 'Published');
        }

        const [{ data, error }, { data: sessionsData }] = await Promise.all([
            query,
            supabase.from('sessions').select('case_id, status')
        ]);

        if (error) {
            console.error('Failed to fetch cases:', error);
            setCases([]);
            setLoading(false);
            return;
        }

        const usageByCase = {};
        (sessionsData || []).forEach((session) => {
            if (!session.case_id) return;
            if (!usageByCase[session.case_id]) {
                usageByCase[session.case_id] = { total: 0, completed: 0 };
            }
            usageByCase[session.case_id].total += 1;
            if (session.status === 'Completed') usageByCase[session.case_id].completed += 1;
        });

        if (data) {
            const formatted = data.map(c => ({
                id: c.id,
                title: c.title,
                category: c.category || 'General',
                difficulty: c.difficulty || 'Intermediate',
                durationMinutes: c.duration_minutes || 0,
                lastModified: c.updated_at || c.created_at,
                status: c.status || 'Draft',
                author: c.author?.full_name || 'Unknown',
                usageTotal: usageByCase[c.id]?.total || 0,
                usageCompleted: usageByCase[c.id]?.completed || 0,
                description: c.description || c.scenario || c.content || '',
                objectives: c.objectives || c.learning_objectives || [],
                checklist: c.checklist || c.assessment_checklist || [],
            }));
            setCases(formatted);
        }
        setLoading(false);
    }, [role]);

    useEffect(() => {
        fetchCases();
    }, [fetchCases]);

    useEffect(() => {
        if (!canCreateCases) return;
        try {
            if (sessionStorage.getItem('medupal_open_create_case') === '1') {
                sessionStorage.removeItem('medupal_open_create_case');
                setIsCreating(true);
            }
        } catch (_) {}
    }, [canCreateCases]);

    const filteredCases = useMemo(() => cases.filter((c) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = c.title.toLowerCase().includes(term)
            || c.author.toLowerCase().includes(term)
            || c.category.toLowerCase().includes(term);
        const matchesDifficulty = difficultyFilter === 'Any Difficulty' || c.difficulty === difficultyFilter;
        return matchesSearch && matchesDifficulty;
    }), [cases, searchTerm, difficultyFilter]);

    const filteredCardiology = useMemo(
        () => filteredCases.filter(isCardiologyCase),
        [filteredCases]
    );
    const filteredRespiratory = useMemo(
        () => filteredCases.filter(isRespiratoryCase),
        [filteredCases]
    );
    const filteredOther = useMemo(
        () => filteredCases.filter((c) => !isCardiologyCase(c) && !isRespiratoryCase(c)),
        [filteredCases]
    );

    const showOtherTab = useMemo(() => (
        cases.some((c) => !isCardiologyCase(c) && !isRespiratoryCase(c))
    ), [cases]);

    const getCaseContent = (caseItem) => {
        const title = caseItem?.title || '';
        const description = caseItem?.description || caseDescriptions[title] || 'No description available for this case.';
        return { description };
    };

    const toggleCaseSelection = (caseId) => {
        setSelectedCaseIds((prev) => (
            prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId]
        ));
    };

    const toggleFavorite = (caseId) => {
        setFavoriteCaseIds((prev) => (
            prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId]
        ));
    };

    const goToAssignPage = () => {
        try {
            sessionStorage.setItem('medupal_selected_case_ids', JSON.stringify(selectedCaseIds));
        } catch (_) {}
        window.history.pushState(null, '', '/assign-exam');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const difficultyTone = (difficulty) => {
        const key = (difficulty || '').toLowerCase();
        if (key.includes('easy')) return 'text-emerald-400';
        if (key.includes('hard')) return 'text-orange-300';
        return 'text-amber-300';
    };

    const statusTone = (status) => (status === 'Published' ? 'text-emerald-400' : 'text-zinc-400');

    const TabButton = ({ id, label, count, paletteKey }) => {
        const active = systemTab === id;
        const { Icon, tabActive, tabIdle } = CATEGORY_UI[paletteKey];
        return (
            <button
                type="button"
                onClick={() => setSystemTab(id)}
                className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    active ? tabActive : tabIdle
                )}
            >
                <Icon size={16} strokeWidth={2} className="shrink-0 opacity-90" />
                <span>{label}</span>
                {count !== undefined && (
                    <span
                        className={cn(
                            'tabular-nums text-xs px-1.5 py-0.5 rounded-md border',
                            active ? 'bg-black/20 border-white/10 text-zinc-100' : 'bg-white/[0.06] border-white/[0.06] text-zinc-500'
                        )}
                    >
                        {count}
                    </span>
                )}
            </button>
        );
    };

    const CaseRow = ({ caseItem }) => {
        const isSelected = selectedCaseIds.includes(caseItem.id);
        const isFavorite = favoriteCaseIds.includes(caseItem.id);
        const isExpanded = expandedCaseId === caseItem.id;
        const { description } = getCaseContent(caseItem);
        const preview = casePreview[caseItem.title];
        const catKey = getCaseCategoryKey(caseItem);
        const { rowBar } = CATEGORY_UI[catKey];

        const toggleExpand = () => {
            setExpandedCaseId((prev) => (prev === caseItem.id ? null : caseItem.id));
        };

        const metaParts = [
            caseItem.category,
            caseItem.author,
            caseItem.usageTotal > 0 ? `${caseItem.usageCompleted}/${caseItem.usageTotal} sessions` : null,
        ].filter(Boolean);

        return (
            <article
                className={cn(
                    'relative flex h-full flex-col rounded-xl overflow-hidden transition-shadow duration-200',
                    'hover:shadow-[0_4px_14px_rgba(0,0,0,0.28)]',
                    isSelected && 'ring-1 ring-[rgba(110,231,183,0.4)]'
                )}
                style={CARD_SURFACE}
            >
                <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', rowBar)} aria-hidden />
                <div className="flex flex-1 flex-col pl-3 sm:pl-4">
                    <div className="flex gap-3 p-4 sm:p-4">
                        <button
                            type="button"
                            onClick={() => toggleCaseSelection(caseItem.id)}
                            className={cn(
                                'mt-0.5 h-10 w-10 shrink-0 rounded-lg border flex items-center justify-center transition-colors',
                                isSelected
                                    ? 'border-[rgba(110,231,183,0.5)] bg-[rgba(110,231,183,0.15)] text-[rgb(110,231,183)]'
                                    : 'border-white/15 bg-white/[0.03] text-transparent hover:border-white/25 hover:bg-white/[0.05]'
                            )}
                            aria-pressed={isSelected}
                            aria-label={isSelected ? 'Remove from assignment' : 'Add to assignment'}
                        >
                            <Check size={18} strokeWidth={2.5} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                        </button>

                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                <div className="min-w-0">
                                    <h3
                                        className="text-base font-semibold leading-snug tracking-tight"
                                        style={{ color: DASHBOARD_THEME.text }}
                                    >
                                        {caseItem.title}
                                    </h3>
                                    <p className="mt-1 text-xs leading-relaxed" style={{ color: DASHBOARD_THEME.muted }}>
                                        {metaParts.join(' · ')}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 text-xs sm:flex-col sm:items-end sm:text-right">
                                    <span className={cn('font-medium tabular-nums', statusTone(caseItem.status))}>
                                        {caseItem.status}
                                    </span>
                                    <span className={cn('font-medium', difficultyTone(caseItem.difficulty))}>
                                        {caseItem.difficulty}
                                    </span>
                                    <span className="tabular-nums text-zinc-500">
                                        {caseItem.durationMinutes} min
                                    </span>
                                </div>
                            </div>

                            <p
                                className="line-clamp-3 text-sm leading-relaxed"
                                style={{ color: DASHBOARD_THEME.muted }}
                            >
                                {description}
                            </p>

                            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
                                <p className="text-xs" style={{ color: isSelected ? DASHBOARD_THEME.accent : DASHBOARD_THEME.muted }}>
                                    {isSelected ? 'In assignment queue' : 'Not in queue — tap square to add'}
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={toggleExpand}
                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100"
                                    >
                                        {isExpanded ? 'Hide' : 'Outline'}
                                        <ChevronDown
                                            size={14}
                                            className={cn('opacity-70 transition-transform', isExpanded && 'rotate-180')}
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleFavorite(caseItem.id)}
                                        className={cn(
                                            'rounded-lg p-2 transition-colors',
                                            isFavorite
                                                ? 'text-rose-400 bg-rose-500/10'
                                                : 'text-zinc-500 hover:bg-white/[0.06] hover:text-rose-400'
                                        )}
                                        title={isFavorite ? 'Remove favorite' : 'Favorite'}
                                    >
                                        <Heart size={17} className={isFavorite ? 'fill-rose-400' : ''} strokeWidth={2} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isExpanded && (
                        <div
                            className="border-t border-white/[0.07] bg-black/[0.12] px-4 pb-4 pt-3 sm:px-5"
                        >
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                Station outline
                            </p>
                            {preview ? (
                                <div className="space-y-4">
                                    {preview.intro && (
                                        <div className="border-l-2 border-amber-500/50 pl-3">
                                            <p className="text-sm leading-relaxed" style={{ color: DASHBOARD_THEME.muted }}>
                                                {preview.intro}
                                            </p>
                                        </div>
                                    )}
                                    {preview.sections.map((section, idx) => (
                                        <div
                                            key={`${section.title}-${idx}`}
                                            className="border-l-2 border-emerald-500/35 pl-3"
                                        >
                                            <p className="text-sm font-medium" style={{ color: DASHBOARD_THEME.text }}>
                                                {section.title}
                                            </p>
                                            <p
                                                className="mt-1 text-sm leading-relaxed"
                                                style={{ color: DASHBOARD_THEME.muted }}
                                            >
                                                {section.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm" style={{ color: DASHBOARD_THEME.muted }}>
                                    No outline available for this case.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </article>
        );
    };

    const caseGridClass = 'grid grid-cols-1 gap-4 xl:grid-cols-2';

    const Section = ({ title, subtitle, cases: list, paletteKey }) => {
        if (list.length === 0) return null;
        const { Icon, chip } = CATEGORY_UI[paletteKey];
        return (
            <section className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.08] pb-3">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', chip)}>
                        <Icon size={18} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold" style={{ color: DASHBOARD_THEME.text }}>
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-xs mt-0.5" style={{ color: DASHBOARD_THEME.muted }}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <span className="text-xs tabular-nums text-zinc-500">
                        {list.length} case{list.length === 1 ? '' : 's'}
                    </span>
                </div>
                <div className={caseGridClass}>
                    {list.map((caseItem) => (
                        <CaseRow key={caseItem.id} caseItem={caseItem} />
                    ))}
                </div>
            </section>
        );
    };

    const renderBody = () => {
        if (loading) {
            return (
                <div className={caseGridClass} aria-busy="true">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-48 rounded-xl animate-pulse bg-white/[0.04] border border-white/[0.06]"
                        />
                    ))}
                </div>
            );
        }

        if (systemTab === 'all') {
            const hasAny = filteredCardiology.length + filteredRespiratory.length + filteredOther.length > 0;
            if (!hasAny) {
                return (
                    <div className="rounded-xl p-10 text-center relative overflow-hidden" style={CARD_SURFACE}>
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 pointer-events-none" aria-hidden />
                        <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/15 border border-white/10 mb-4">
                            <FileSearch className="h-7 w-7 text-violet-300" strokeWidth={2} />
                        </div>
                        <p className="text-sm font-medium relative" style={{ color: DASHBOARD_THEME.text }}>
                            No cases match your search
                        </p>
                        <p className="text-sm mt-2 max-w-md mx-auto relative" style={{ color: DASHBOARD_THEME.muted }}>
                            Try clearing the search box or setting difficulty to &quot;Any Difficulty&quot;.
                        </p>
                    </div>
                );
            }
            return (
                <div className="space-y-10">
                    <Section
                        title="Cardiology"
                        subtitle="Circulation and valve scenarios"
                        cases={filteredCardiology}
                        paletteKey="cardiology"
                    />
                    <Section
                        title="Respiratory"
                        subtitle="Airways, lungs, and breathing assessments"
                        cases={filteredRespiratory}
                        paletteKey="respiratory"
                    />
                    <Section
                        title="Other scenarios"
                        subtitle="General and mixed categories"
                        cases={filteredOther}
                        paletteKey="other"
                    />
                </div>
            );
        }

        const singleList = systemTab === 'cardiology'
            ? filteredCardiology
            : systemTab === 'respiratory'
                ? filteredRespiratory
                : filteredOther;

        if (singleList.length === 0) {
            return (
                <div className="rounded-xl p-10 text-center relative overflow-hidden" style={CARD_SURFACE}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 via-transparent to-sky-500/5 pointer-events-none" aria-hidden />
                    <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/15 to-sky-500/15 border border-white/10 mb-4">
                        <Inbox className="h-7 w-7 text-sky-300" strokeWidth={2} />
                    </div>
                    <p className="text-sm font-medium relative" style={{ color: DASHBOARD_THEME.text }}>
                        Nothing here yet
                    </p>
                    <p className="text-sm mt-2 max-w-md mx-auto relative" style={{ color: DASHBOARD_THEME.muted }}>
                        Adjust filters or pick another category tab.
                    </p>
                </div>
            );
        }

        return (
            <div className={caseGridClass}>
                {singleList.map((caseItem) => (
                    <CaseRow key={caseItem.id} caseItem={caseItem} />
                ))}
            </div>
        );
    };

    return (
        <div className="relative mx-auto w-full max-w-screen-2xl space-y-5 px-3 sm:px-5 lg:px-8">
            {isCreating && canCreateCases && (
                <CreateCaseForm
                    onClose={() => setIsCreating(false)}
                    onCreated={fetchCases}
                />
            )}

            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/25 via-sky-500/20 to-violet-500/20 border border-white/10">
                        <BookOpen className="h-5 w-5 text-emerald-200" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: DASHBOARD_THEME.text }}>
                            Case library
                        </h1>
                        <p className="mt-0.5 text-sm line-clamp-2 sm:line-clamp-none" style={{ color: DASHBOARD_THEME.muted }}>
                            Pick cases for exams, open outlines when you need detail.
                        </p>
                    </div>
                </div>
                {canCreateCases && (
                    <button
                        type="button"
                        onClick={() => setIsCreating(true)}
                        className="inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 bg-gradient-to-r from-fuchsia-500/20 to-violet-500/15 text-fuchsia-200 border border-fuchsia-400/30"
                    >
                        <Sparkles size={18} strokeWidth={2} />
                        New case
                    </button>
                )}
            </header>

            <div
                className="sticky top-0 z-30 space-y-2 border-b border-white/[0.06] py-2 sm:py-3 -mx-1 px-1 sm:-mx-2 sm:px-2"
                style={{
                    background: 'color-mix(in srgb, hsl(var(--background)) 92%, transparent)',
                    backdropFilter: 'blur(10px)',
                }}
            >
                {selectedCaseIds.length > 0 && (
                    <div
                        className="rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-3 relative overflow-hidden"
                        style={{
                            ...CARD_SURFACE,
                            border: '1px solid rgba(110,231,183,0.28)',
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/8 via-teal-500/5 to-cyan-500/8 pointer-events-none" aria-hidden />
                        <p className="text-sm flex items-center gap-2 relative" style={{ color: DASHBOARD_THEME.text }}>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-400/25">
                                <ClipboardList size={16} className="text-emerald-300" strokeWidth={2} />
                            </span>
                            <span>
                                <span className="font-semibold tabular-nums text-emerald-200">{selectedCaseIds.length}</span>
                                {' '}selected — continue when ready
                            </span>
                        </p>
                        <button
                            type="button"
                            onClick={goToAssignPage}
                            className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110 bg-gradient-to-r from-emerald-500/20 to-teal-500/15"
                            style={{
                                color: DASHBOARD_THEME.accent,
                                border: '1px solid rgba(110,231,183,0.35)',
                            }}
                        >
                            <Send size={16} strokeWidth={2} />
                            Assign exam
                        </button>
                    </div>
                )}
                <div className="rounded-xl p-3 sm:p-4 space-y-3 relative overflow-hidden" style={CARD_SURFACE}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400/80" size={18} strokeWidth={2} />
                            <input
                                type="search"
                                placeholder="Search by title, category, or author"
                                className="w-full rounded-lg border border-sky-500/15 bg-sky-950/20 pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500/25 focus:border-sky-400/30 text-zinc-100 placeholder:text-zinc-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-full lg:w-56 shrink-0">
                            <label className="sr-only" htmlFor="cases-difficulty">Difficulty</label>
                            <div className="relative w-full">
                                <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/80 pointer-events-none" size={18} strokeWidth={2} />
                                <select
                                    id="cases-difficulty"
                                    className="w-full rounded-lg border border-amber-500/15 bg-amber-950/15 pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400/25 text-zinc-200 cursor-pointer appearance-none"
                                    value={difficultyFilter}
                                    onChange={(e) => setDifficultyFilter(e.target.value)}
                                >
                                    <option>Any Difficulty</option>
                                    <option>Easy</option>
                                    <option>Intermediate</option>
                                    <option>Hard</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div
                        className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 [scrollbar-width:thin]"
                        role="tablist"
                        aria-label="Case category"
                    >
                        <TabButton
                            id="all"
                            label="All"
                            count={filteredCases.length}
                            paletteKey="all"
                        />
                        <TabButton
                            id="cardiology"
                            label="Cardiology"
                            count={filteredCardiology.length}
                            paletteKey="cardiology"
                        />
                        <TabButton
                            id="respiratory"
                            label="Respiratory"
                            count={filteredRespiratory.length}
                            paletteKey="respiratory"
                        />
                        {showOtherTab && (
                            <TabButton
                                id="other"
                                label="Other"
                                count={filteredOther.length}
                                paletteKey="other"
                            />
                        )}
                    </div>
                </div>
            </div>

            {renderBody()}
        </div>
    );
}
