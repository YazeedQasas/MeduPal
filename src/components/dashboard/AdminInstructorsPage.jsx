import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  GraduationCap,
  Loader2,
  Mail,
  Search,
  UserCog,
  Users,
  Save,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

function initials(name, email) {
  const n = (name || '').trim();
  if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  const e = (email || '').trim();
  if (e.length >= 2) return e.slice(0, 2).toUpperCase();
  return '—';
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function AdminInstructorsPage() {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [draftStudentIds, setDraftStudentIds] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const prevSelectedIdRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [instrRes, studRes, asgnRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, created_at, role')
          .eq('role', 'instructor')
          .order('full_name', { ascending: true, nullsFirst: false }),
        supabase
          .from('profiles')
          .select('id, full_name, email, can_exam, role')
          .eq('role', 'student')
          .order('full_name', { ascending: true, nullsFirst: false }),
        supabase.from('advisor_assignments').select('id, instructor_id, student_id'),
      ]);

      if (instrRes.error) throw instrRes.error;
      if (studRes.error) throw studRes.error;
      if (asgnRes.error) throw asgnRes.error;

      setRows((instrRes.data || []).filter((p) => p.role === 'instructor'));
      setStudents((studRes.data || []).filter((p) => p.role === 'student'));
      setAssignments(asgnRes.data || []);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Could not load data.');
      setRows([]);
      setStudents([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const instructorNameById = useMemo(() => {
    const m = {};
    rows.forEach((r) => {
      m[r.id] = r.full_name || r.email || 'Instructor';
    });
    return m;
  }, [rows]);

  const assignmentByStudentId = useMemo(() => {
    const m = {};
    assignments.forEach((a) => {
      m[a.student_id] = a;
    });
    return m;
  }, [assignments]);

  const currentForSelected = useMemo(() => {
    if (!selectedId) return new Set();
    return new Set(
      assignments.filter((a) => a.instructor_id === selectedId).map((a) => a.student_id)
    );
  }, [assignments, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDraftStudentIds(new Set());
      prevSelectedIdRef.current = null;
      return;
    }
    if (prevSelectedIdRef.current !== selectedId) {
      setStudentSearch('');
      setSaveMessage(null);
      setSaveError(null);
      prevSelectedIdRef.current = selectedId;
    }
    const ids = assignments
      .filter((a) => a.instructor_id === selectedId)
      .map((a) => a.student_id);
    setDraftStudentIds(new Set(ids));
  }, [selectedId, assignments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => {
      const name = (p.full_name || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      return name.includes(q) || email.includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [rows, search]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((p) => {
      const name = (p.full_name || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      return name.includes(q) || email.includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [students, studentSearch]);

  const selected = useMemo(() => rows.find((p) => p.id === selectedId) || null, [rows, selectedId]);

  const dirty = selectedId ? !setsEqual(draftStudentIds, currentForSelected) : false;

  const toggleStudent = (studentId) => {
    setDraftStudentIds((prev) => {
      const n = new Set(prev);
      if (n.has(studentId)) n.delete(studentId);
      else n.add(studentId);
      return n;
    });
    setSaveMessage(null);
    setSaveError(null);
  };

  const selectAllFiltered = () => {
    setDraftStudentIds((prev) => {
      const n = new Set(prev);
      filteredStudents.forEach((s) => n.add(s.id));
      return n;
    });
    setSaveMessage(null);
    setSaveError(null);
  };

  const clearDraft = () => {
    setDraftStudentIds(new Set());
    setSaveMessage(null);
    setSaveError(null);
  };

  const resetDraft = () => {
    setDraftStudentIds(new Set(currentForSelected));
    setSaveMessage(null);
    setSaveError(null);
  };

  const saveAssignments = async () => {
    if (!selectedId) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const current = currentForSelected;
      const desired = draftStudentIds;
      const toRemove = [...current].filter((id) => !desired.has(id));
      const toAdd = [...desired].filter((id) => !current.has(id));

      for (const sid of toRemove) {
        const row = assignments.find((a) => a.instructor_id === selectedId && a.student_id === sid);
        if (!row) continue;
        const { error: delErr } = await supabase.from('advisor_assignments').delete().eq('id', row.id);
        if (delErr) throw delErr;
      }

      for (const sid of toAdd) {
        const existing = assignments.find((a) => a.student_id === sid);
        if (existing) {
          const { error: delOther } = await supabase.from('advisor_assignments').delete().eq('id', existing.id);
          if (delOther) throw delOther;
        }
        const { error: insErr } = await supabase
          .from('advisor_assignments')
          .insert([{ instructor_id: selectedId, student_id: sid }]);
        if (insErr) throw insErr;
      }

      const { data: nextAsgn, error: refErr } = await supabase
        .from('advisor_assignments')
        .select('id, instructor_id, student_id');
      if (refErr) throw refErr;
      setAssignments(nextAsgn || []);
      setSaveMessage('Student assignments updated.');
    } catch (e) {
      console.error(e);
      setSaveError(
        e.message?.includes('row-level security') || e.code === '42501'
          ? 'Permission denied. Run supabase_migration_advisor_assignments_admin_rls.sql in Supabase so admins can manage assignments.'
          : e.message || 'Save failed.'
      );
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-[1280px] mx-auto pb-16">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <UserCog className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest">Admin</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Instructors</h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm sm:text-base">
            Pick an instructor, then choose which students they may assign to exams (stored in{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">advisor_assignments</code>). Each student
            can only belong to one instructor at a time.
          </p>
        </div>
        {!loading && !error && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shrink-0">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium tabular-nums">{rows.length}</span>
            <span className="text-sm text-muted-foreground">instructor{rows.length === 1 ? '' : 's'}</span>
          </div>
        )}
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter instructors by name or email…"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
          autoComplete="off"
          aria-label="Filter instructors"
        />
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading instructors and students…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-destructive/35 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-8 py-16 text-center">
          <UserCog className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-foreground font-medium">No instructor accounts yet</p>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            Create accounts in Supabase Auth and set their <span className="font-mono text-xs">profiles.role</span>{' '}
            to <span className="font-mono text-xs">instructor</span>.
          </p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 xl:col-span-8">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Step 1 — Instructor{' '}
                {search.trim() ? `· ${filtered.length} match${filtered.length === 1 ? '' : 'es'}` : ''}
              </p>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8">No instructors match your filter.</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filtered.map((p) => {
                    const isSel = p.id === selectedId;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(p.id)}
                          className={cn(
                            'w-full text-left rounded-2xl border p-4 transition-all duration-200',
                            'hover:border-primary/40 hover:bg-primary/[0.03]',
                            isSel
                              ? 'border-primary ring-2 ring-primary/25 bg-primary/[0.06] shadow-sm'
                              : 'border-border bg-card'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                isSel ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              )}
                              aria-hidden
                            >
                              {initials(p.full_name, p.email)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground truncate">{p.full_name || 'Unnamed'}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{p.email || 'No email'}</p>
                              <span className="inline-flex mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded-md">
                                Instructor
                              </span>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <aside className="lg:col-span-5 xl:col-span-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Instructor profile
              </p>
              <div className="rounded-2xl border border-border bg-card p-6 min-h-[240px] lg:sticky lg:top-4">
                {!selected ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8 text-muted-foreground text-sm">
                    <UserCog className="h-10 w-10 mb-3 opacity-40" />
                    <p>Select an instructor to assign students.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {initials(selected.full_name, selected.email)}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-foreground truncate">{selected.full_name || 'Unnamed'}</h2>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">Instructor</p>
                      </div>
                    </div>
                    <dl className="space-y-4 text-sm">
                      <div>
                        <dt className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </dt>
                        <dd className="text-foreground break-all">{selected.email || '—'}</dd>
                      </div>
                      <div>
                        <dt className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3.5 w-3.5" /> Profile created
                        </dt>
                        <dd className="text-foreground">
                          {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground mb-1">User ID</dt>
                        <dd className="font-mono text-[11px] leading-relaxed text-foreground bg-muted/60 rounded-lg px-3 py-2 break-all">
                          {selected.id}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            </aside>
          </div>

          {selected && (
            <section className="rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-widest">Step 2</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Students for exam assignment</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                    Checked students appear in this instructor&apos;s Assign Exam flow. If a student is already
                    linked to someone else, saving will move them to{' '}
                    <span className="font-medium text-foreground">{selected.full_name || 'this instructor'}</span>.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="text-xs font-medium px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors"
                  >
                    Check all in filter ({filteredStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="text-xs font-medium px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={resetDraft}
                    disabled={!dirty}
                    className="text-xs font-medium px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/60 transition-colors disabled:opacity-40"
                  >
                    Revert
                  </button>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Filter students…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                  autoComplete="off"
                  aria-label="Filter students"
                />
              </div>

              {saveError && (
                <div className="flex gap-2 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}
              {saveMessage && !saveError && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 mb-4">
                  <Check className="h-4 w-4 shrink-0" />
                  {saveMessage}
                </div>
              )}

              <div className="max-h-[min(420px,50vh)] overflow-y-auto rounded-xl border border-border divide-y divide-border bg-background">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-6 text-center">No students match.</p>
                ) : (
                  filteredStudents.map((s) => {
                    const checked = draftStudentIds.has(s.id);
                    const asg = assignmentByStudentId[s.id];
                    const other =
                      asg && asg.instructor_id !== selectedId
                        ? instructorNameById[asg.instructor_id] || 'Another instructor'
                        : null;
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors',
                          checked && 'bg-primary/[0.04]'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                          checked={checked}
                          onChange={() => toggleStudent(s.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{s.full_name || 'Unnamed'}</span>
                            <span
                              className={cn(
                                'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border',
                                s.can_exam
                                  ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                                  : 'border-border text-muted-foreground bg-muted/40'
                              )}
                            >
                              {s.can_exam ? 'Exam enabled' : 'Practice only'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{s.email || 'No email'}</p>
                          {other && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-1">
                              Currently with {other}
                              {checked ? ' — will reassign on save' : ''}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {draftStudentIds.size} selected
                  {dirty ? ' · unsaved changes' : ' · saved'}
                </p>
                <button
                  type="button"
                  onClick={saveAssignments}
                  disabled={saving || !dirty}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-45 disabled:pointer-events-none transition-colors"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save assignments
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
