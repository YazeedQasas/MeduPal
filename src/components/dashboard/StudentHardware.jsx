import React, { useState, useEffect } from 'react';
import { Cpu, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export function StudentHardware() {
  const { has_hardware } = useAuth();
  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchControllers = async () => {
      const { data } = await supabase.from('controllers').select('id, name, status');
      setControllers(data || []);
      setLoading(false);
    };
    fetchControllers();
  }, []);

  const connectedCount = controllers.filter((c) => c.status === 'Online').length;

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Hardware</h1>
      <p className="text-muted-foreground text-sm">Manikin and sensor connection status.</p>

      <div className="rounded-xl border border-white/10 bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Access</h2>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            has_hardware ? 'bg-emerald-500/15' : 'bg-muted/50'
          )}>
            {has_hardware ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertCircle size={20} className="text-muted-foreground" />}
          </div>
          <div>
            <p className="font-medium text-foreground">{has_hardware ? 'Hardware Enabled' : 'Hardware Disabled'}</p>
            <p className="text-xs text-muted-foreground">
              {has_hardware ? 'You can use the manikin and sensors for practice.' : 'Enable in Settings to use practice hardware.'}
            </p>
          </div>
        </div>
      </div>

      {has_hardware && (
        <div className="rounded-xl border border-white/10 bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Manikin Status</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-3">
              {controllers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No controllers detected. Connect a manikin to see status.</p>
              ) : (
                controllers.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <Cpu size={18} className="text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{c.name || c.id}</span>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        c.status === 'Online'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-muted/50 text-muted-foreground'
                      )}
                    >
                      {c.status || 'Unknown'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
