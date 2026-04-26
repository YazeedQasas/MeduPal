import { useEffect, useRef, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export function Header() {
    const { user, profile } = useAuth();
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
    const [notificationCount, setNotificationCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const [localVersion, setLocalVersion] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        let channel;

        const loadNotifications = async () => {
            if (!user?.id) {
                if (mounted) {
                    setNotificationCount(0);
                    setNotifications([]);
                }
                return;
            }

            // Try multiple schema patterns.
            const [recipientRes, userRes, sourceRes] = await Promise.all([
                supabase
                    .from('alerts')
                    .select('id, type, message, created_at')
                    .eq('recipient_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(12),
                supabase
                    .from('alerts')
                    .select('id, type, message, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(12),
                supabase
                    .from('alerts')
                    .select('id, type, message, created_at')
                    .eq('source_id', `student:${user.id}`)
                    .order('created_at', { ascending: false })
                    .limit(12),
            ]);

            let merged = [];
            if (!recipientRes.error) merged = merged.concat(recipientRes.data || []);
            if (!userRes.error) merged = merged.concat(userRes.data || []);
            if (!sourceRes.error) merged = merged.concat(sourceRes.data || []);

            // Local fallback notifications for client-side delivery.
            try {
                const localRaw = localStorage.getItem('local_student_alerts_v1');
                if (localRaw) {
                    const localMap = JSON.parse(localRaw);
                    const userLocal = Array.isArray(localMap?.[user.id]) ? localMap[user.id] : [];
                    merged = merged.concat(userLocal);
                }
            } catch {
                // ignore malformed local cache
            }

            // If no targeted query works, fallback to recent global alerts.
            if (merged.length === 0 && recipientRes.error && userRes.error && sourceRes.error) {
                const { data: fallback } = await supabase
                    .from('alerts')
                    .select('id, type, message, created_at')
                    .order('created_at', { ascending: false })
                    .limit(8);
                merged = fallback || [];
            }

            const deduped = Array.from(
                new Map(merged.map((item) => [item.id, item])).values()
            )
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 8);

            if (mounted) {
                setNotifications(deduped);
                setNotificationCount(deduped.length);
            }
        };

        loadNotifications();

        channel = supabase
            .channel(`header-alerts-${user?.id || 'anon'}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => {
                loadNotifications();
            })
            .subscribe();

        return () => {
            mounted = false;
            if (channel) supabase.removeChannel(channel);
        };
    }, [user?.id, localVersion]);

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'local_student_alerts_v1') {
                setLocalVersion((v) => v + 1);
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        const onDocClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    const formatTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getTypeColor = (type) => {
        if (type === 'critical') return 'text-red-300';
        if (type === 'warning') return 'text-amber-300';
        if (type === 'success') return 'text-emerald-300';
        return 'text-slate-300';
    };

    return (
        <header className="h-16 shrink-0 border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-[0_1px_0_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-foreground">Welcome back, {displayName}</h2>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    System Operational
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                        type="text"
                        placeholder="Search stations, students..."
                        className="h-9 pl-9 pr-4 rounded-md bg-muted/50 border border-transparent focus:border-ring focus:bg-background text-sm outline-none w-64 transition-all"
                    />
                </div>

                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="relative p-2 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Bell size={20} />
                        {notificationCount > 0 && (
                            <>
                                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-card" />
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] leading-4 text-white text-center">
                                    {notificationCount > 99 ? '99+' : notificationCount}
                                </span>
                            </>
                        )}
                    </button>

                    {open && (
                        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[90vw] rounded-xl border border-white/10 bg-[#0b0f10] shadow-[0_16px_40px_rgba(0,0,0,0.45)] overflow-hidden z-[120]">
                            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-[#0d1314]">
                                <p className="text-sm font-semibold" style={{ color: '#f8fafc' }}>Notifications</p>
                                <span className="text-[11px]" style={{ color: '#94a3b8' }}>{notificationCount} total</span>
                            </div>
                            <div className="max-h-72 min-h-14 overflow-y-auto bg-[#0b0f10]">
                                {notifications.length === 0 ? (
                                    <p className="px-3 py-6 text-xs text-center" style={{ color: '#94a3b8' }}>No notifications yet.</p>
                                ) : (
                                    notifications.map((n) => (
                                        <div key={n.id} className="px-3 py-2.5 border-b border-white/5 last:border-0 bg-[#0b0f10]">
                                            <p className={`text-xs font-medium ${getTypeColor(n.type)}`}>
                                                {n.type || 'Alert'}
                                            </p>
                                            <p className="text-sm mt-0.5 leading-snug" style={{ color: '#f1f5f9' }}>
                                                {n.message || 'New notification'}
                                            </p>
                                            <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>
                                                {formatTime(n.created_at)}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
