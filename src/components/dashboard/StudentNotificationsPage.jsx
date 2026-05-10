import { useEffect, useState, useCallback } from 'react';
import { Bell, AlertTriangle, CheckCircle2, Info, AlertCircle, ChevronRight, Inbox } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const seenKey = (uid) => `seen_notifications_${uid}`;

const getSeenIds = (uid) => {
    try { return new Set(JSON.parse(localStorage.getItem(seenKey(uid))) || []); }
    catch { return new Set(); }
};

const saveSeenIds = (uid, ids) => {
    try { localStorage.setItem(seenKey(uid), JSON.stringify([...ids].slice(-300))); }
    catch {}
};

const TYPE_META = {
    critical: { label: 'Critical',  icon: AlertCircle,   bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400',     dot: 'bg-red-500'     },
    warning:  { label: 'Warning',   icon: AlertTriangle, bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   dot: 'bg-amber-500'   },
    success:  { label: 'Success',   icon: CheckCircle2,  bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-500' },
    info:     { label: 'Info',      icon: Info,          bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    dot: 'bg-blue-500'    },
};

const getMeta = (type) => TYPE_META[type] || TYPE_META.info;

function formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRelative(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

export function StudentNotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user?.id) return;

        const formatSession = (s) => ({
            id: `session-${s.id}`,
            type: 'warning',
            message: `You have a new OSCE exam scheduled for ${formatTime(s.start_time)}.`,
            created_at: s.created_at || s.start_time,
        });

        const [recipientRes, userRes, sourceRes, sessionsRes] = await Promise.all([
            supabase.from('alerts').select('id, type, message, created_at').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(20),
            supabase.from('alerts').select('id, type, message, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
            supabase.from('alerts').select('id, type, message, created_at').eq('source_id', `student:${user.id}`).order('created_at', { ascending: false }).limit(20),
            supabase.from('sessions').select('id, start_time, created_at, status, session_type').eq('student_id', user.id).in('status', ['Scheduled', 'In Progress', 'scheduled', 'in_progress']).eq('session_type', 'exam').order('created_at', { ascending: false }).limit(10),
        ]);

        let merged = [];
        if (!recipientRes.error) merged = merged.concat(recipientRes.data || []);
        if (!userRes.error)      merged = merged.concat(userRes.data || []);
        if (!sourceRes.error)    merged = merged.concat(sourceRes.data || []);
        if (!sessionsRes.error)  merged = merged.concat((sessionsRes.data || []).map(formatSession));

        try {
            const localRaw = localStorage.getItem('local_student_alerts_v1');
            if (localRaw) {
                const localMap = JSON.parse(localRaw);
                const userLocal = Array.isArray(localMap?.[user.id]) ? localMap[user.id] : [];
                merged = merged.concat(userLocal);
            }
        } catch {}

        const deduped = Array.from(new Map(merged.map((n) => [String(n.id), n])).values())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Mark all as seen
        const seenIds = getSeenIds(user.id);
        deduped.forEach((n) => seenIds.add(String(n.id)));
        saveSeenIds(user.id, seenIds);

        // Pre-select notification passed from the bell dropdown, then clear it
        let initialId = null;
        try {
            initialId = sessionStorage.getItem('selected_notification_id');
            if (initialId) sessionStorage.removeItem('selected_notification_id');
        } catch {}

        setNotifications(deduped);
        setSelected(() => {
            if (initialId) return deduped.find((n) => String(n.id) === initialId) ?? deduped[0] ?? null;
            return deduped[0] ?? null;
        });
        setLoading(false);
    }, [user?.id]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Loading notifications…
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Page header */}
            <div className="flex items-center gap-3">
                <Bell size={20} className="text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
                {notifications.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {notifications.length}
                    </span>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                    <Inbox size={32} className="text-muted-foreground/30" />
                    <p className="text-sm font-medium text-foreground">All caught up</p>
                    <p className="text-xs text-muted-foreground">No notifications yet.</p>
                </div>
            ) : (
                <div className="flex gap-4 h-[calc(100vh-11rem)] min-h-0">

                    {/* ── Left panel: notification list ── */}
                    <div className="w-72 xl:w-80 shrink-0 flex flex-col gap-1 overflow-y-auto pr-1">
                        {notifications.map((n) => {
                            const meta = getMeta(n.type);
                            const Icon = meta.icon;
                            const isActive = selected?.id === n.id;
                            return (
                                <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => setSelected(n)}
                                    className={`w-full text-left rounded-lg px-3 py-3 border transition-all duration-150 flex items-start gap-3 ${
                                        isActive
                                            ? `${meta.bg} ${meta.border} border`
                                            : 'border-transparent hover:bg-muted/40'
                                    }`}
                                >
                                    <span className={`mt-0.5 shrink-0 ${meta.text}`}>
                                        <Icon size={15} />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
                                            {n.message || 'New notification'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            {formatRelative(n.created_at)}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <ChevronRight size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Right panel: detail ── */}
                    <div className="flex-1 min-w-0 rounded-xl border border-white/[0.07] bg-card/40 backdrop-blur-sm overflow-y-auto">
                        {selected ? (
                            () => {
                                const meta = getMeta(selected.type);
                                const Icon = meta.icon;
                                return (
                                    <div className="p-6 flex flex-col gap-6">
                                        {/* Type badge */}
                                        <div className={`inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full border text-xs font-semibold ${meta.bg} ${meta.border} ${meta.text}`}>
                                            <Icon size={13} />
                                            {meta.label}
                                        </div>

                                        {/* Message */}
                                        <p className="text-base text-foreground leading-relaxed">
                                            {selected.message || 'No details available.'}
                                        </p>

                                        {/* Metadata */}
                                        <div className="flex flex-col gap-2 pt-4 border-t border-white/[0.07]">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="font-medium text-foreground/60">Received</span>
                                                <span>{formatTime(selected.created_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="font-medium text-foreground/60">Type</span>
                                                <span className={`capitalize ${meta.text}`}>{selected.type || 'info'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        )() : (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-8">
                                <Bell size={24} className="text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground">Select a notification to view details</p>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}
