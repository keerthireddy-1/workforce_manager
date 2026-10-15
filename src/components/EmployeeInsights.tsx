import { useEffect, useState } from 'react';
import { Award, Briefcase, Activity, GraduationCap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ---------- Types (match server/insights.ts) ---------- */
type Skill = { id: string; name: string; category: string; level: number; years: number; lastUsedYear: number; certified: boolean };
type Requirement = { skillId: string; name: string; required: number; mine: number; met: boolean; importance: number };
type Match = {
  projectId: string; name: string; client: string; priority: string; status: string;
  start: string; earliestJoin: string; hasCapacity: boolean; score: number; requirements: Requirement[];
};
type Course = { id: string; title: string; hours: number; provider: string; mode: string; from: number; to: number };
type Training = { skillId: string; skill: string; current: number; target: number; neededFor: string[]; courses: Course[]; totalHours: number };
type Workload = {
  capacityHours: number; allocationPct: number; allocatedHours: number; availableHours: number;
  status: string; availableFrom: string;
  breakdown: { projectId: string; projectName: string; role: string; pct: number; hours: number; start: string; end: string }[];
  upcomingLeaves: { type: string; start: string; end: string }[];
};
type Insights = {
  employee: { id: string; name: string; role: string; department: string; seniority: string; location: string; experienceYears: number };
  skills: Skill[]; matches: Match[]; workload: Workload; training: Training[];
};
type EmployeeOption = { id: string; name: string; role: string; department: string };

/* ---------- Helpers ---------- */
const card = 'rounded-3xl border border-white/5 bg-white/[0.03] p-6';
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const SEGMENTS = ['bg-indigo-500', 'bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-fuchsia-500', 'bg-amber-500'];

function PanelTitle({ icon: Icon, title, note }: { icon: LucideIcon; title: string; note: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold tracking-wide text-white">{title}</h3>
        <p className="text-xs text-slate-500">{note}</p>
      </div>
    </div>
  );
}

function Bar({ value, tone = 'bg-indigo-500' }: { value: number; tone?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function Level({ level }: { level: number }) {
  return (
    <div className="flex gap-1" aria-label={`Proficiency ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`h-2 w-6 rounded-full ${n <= level ? 'bg-indigo-500' : 'bg-white/10'}`} />
      ))}
    </div>
  );
}

/* ---------- Component ---------- */
/** Pass employeeId to lock it to one person (e.g. the logged-in user's dataset id).
 *  Without it, a picker is shown so you can view any employee in the dataset. */
export default function EmployeeInsights({ employeeId }: { employeeId?: string }) {
  const [options, setOptions] = useState<EmployeeOption[]>([]);
  const [selected, setSelected] = useState<string | undefined>(employeeId);
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employeeId) { setSelected(employeeId); return; }
    fetch('/api/insights/employees')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load employees'))))
      .then((list: EmployeeOption[]) => { setOptions(list); setSelected((cur) => cur ?? list[0]?.id); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [employeeId]);

  useEffect(() => {
    if (!selected) return;
    let live = true;
    setLoading(true);
    setError('');
    fetch(`/api/insights/${selected}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Employee not found in the dataset'))))
      .then((d: Insights) => live && setData(d))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [selected]);

  if (error) {
    return <p className="mt-10 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">{error}</p>;
  }
  if (!data) {
    return <p className="mt-10 text-sm text-slate-500">{loading ? 'Loading your insights…' : ''}</p>;
  }

  const { employee, skills, matches, workload, training } = data;
  const free = Math.max(100 - workload.allocationPct, 0);
  const loadTone = workload.allocationPct > 100 ? 'text-rose-400' : workload.allocationPct >= 85 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <section className={`mt-10 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-label="My insights">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{employee.name}</h2>
          <p className="text-sm text-slate-400">
            {employee.role} · {employee.department} · {employee.seniority} · {employee.location}
          </p>
        </div>
        {!employeeId && (
          <label className="text-xs text-slate-500">
            Viewing employee
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="ml-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.name} ({o.role})</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skills */}
        <div className={card}>
          <PanelTitle icon={Award} title="My skills" note={`${skills.length} skills · proficiency out of 5`} />
          <ul className="space-y-4">
            {skills.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {s.name}
                    {s.certified && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">Certified</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.category} · {s.years} yrs · last used {s.lastUsedYear}
                  </p>
                </div>
                <Level level={s.level} />
              </li>
            ))}
          </ul>
        </div>

        {/* Project matches */}
        <div className={card}>
          <PanelTitle icon={Briefcase} title="Project matches" note="Open projects ranked by skill fit" />
          {matches.length === 0 ? (
            <p className="text-sm text-slate-400">No open projects to match right now.</p>
          ) : (
            <ul className="space-y-3">
              {matches.map((m) => (
                <li key={m.projectId} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{m.name}</p>
                      <p className="text-xs text-slate-500">
                        {m.client} · {m.priority} priority · {m.status}
                      </p>
                    </div>
                    <span className={`text-lg font-bold ${m.score >= 75 ? 'text-emerald-400' : m.score >= 40 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {m.score}%
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.requirements.map((r) => (
                      <span
                        key={r.skillId}
                        className={`rounded-full px-2 py-0.5 text-xs ${r.met ? 'bg-indigo-500/15 text-indigo-300' : 'bg-rose-500/10 text-rose-300'}`}
                        title={`You: ${r.mine} · Required: ${r.required}`}
                      >
                        {r.name} {r.mine}/{r.required}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {m.hasCapacity ? `Could join from ${fmt(m.earliestJoin)}` : 'No spare hours right now'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Workload distribution */}
        <div className={card}>
          <PanelTitle icon={Activity} title="Workload" note={`${workload.status} · ${workload.capacityHours} hrs/week capacity`} />
          <div className="mb-4 flex items-baseline justify-between">
            <p className={`text-3xl font-bold ${loadTone}`}>{workload.allocationPct}%</p>
            <p className="text-sm text-slate-400">
              {workload.allocatedHours} hrs booked · {workload.availableHours} hrs free
            </p>
          </div>
          <div className="mb-5 flex h-3 w-full overflow-hidden rounded-full bg-white/5" aria-label="Allocation by project">
            {workload.breakdown.map((b, i) => (
              <div key={b.projectId} className={SEGMENTS[i % SEGMENTS.length]} style={{ width: `${Math.min(b.pct, 100)}%` }} title={`${b.projectName}: ${b.pct}%`} />
            ))}
            {free > 0 && <div className="bg-white/10" style={{ width: `${free}%` }} />}
          </div>
          <ul className="space-y-2">
            {workload.breakdown.map((b, i) => (
              <li key={b.projectId} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-slate-200">
                  <span className={`h-2.5 w-2.5 rounded-full ${SEGMENTS[i % SEGMENTS.length]}`} />
                  {b.projectName}
                  <span className="text-xs text-slate-500">{b.role}</span>
                </span>
                <span className="text-xs text-slate-400">{b.pct}% · {b.hours}h</span>
              </li>
            ))}
            {workload.breakdown.length === 0 && <li className="text-sm text-slate-400">Not assigned to any project.</li>}
          </ul>
          {workload.upcomingLeaves.length > 0 && (
            <div className="mt-5 border-t border-white/5 pt-4">
              <p className="mb-2 text-xs font-semibold text-slate-400">Upcoming leave</p>
              {workload.upcomingLeaves.map((l) => (
                <p key={l.start} className="text-xs text-slate-500">
                  {l.type}: {fmt(l.start)} to {fmt(l.end)}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Training recommendations */}
        <div className={card}>
          <PanelTitle icon={GraduationCap} title="Training for you" note="Closes the gaps in your top 3 project matches" />
          {training.length === 0 ? (
            <p className="text-sm text-slate-400">No gaps found. Your skills cover your top project matches.</p>
          ) : (
            <ul className="space-y-3">
              {training.map((t) => (
                <li key={t.skillId} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{t.skill}</p>
                      <p className="text-xs text-slate-500">Level {t.current} → {t.target} · {t.totalHours} hrs total</p>
                    </div>
                    <span className="text-right text-xs text-slate-500">Needed for {t.neededFor.join(', ')}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {t.courses.map((c) => (
                      <li key={c.id} className="text-xs text-slate-300">
                        {c.title} <span className="text-slate-500">· {c.hours}h · {c.provider} · {c.mode}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
