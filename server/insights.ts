import fs from 'node:fs';
import path from 'node:path';

/**
 * Data source. Right now this reads the CSV exports from ./data.
 * To move to Databricks later, replace ONLY loadData() so it returns the
 * same eight tables (employees, skills, employeeSkills, projects,
 * requirements, assignments, courses, leaves). Nothing else needs to change.
 */
const DATA_DIR = process.env.WORKFORCE_DATA_DIR ?? path.join(process.cwd(), 'data');

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { cur.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      cur.push(field); field = '';
      if (cur.some((c) => c !== '')) rows.push(cur);
      cur = [];
    } else field += ch;
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const read = (file: string) => parseCsv(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));

let cache: ReturnType<typeof loadData> | null = null;
function loadData() {
  return {
    employees: read('employees.csv'),
    skills: read('skills.csv'),
    employeeSkills: read('employee_skills.csv'),
    projects: read('projects.csv'),
    requirements: read('project_requirements.csv'),
    assignments: read('assignments.csv'),
    courses: read('training_courses.csv'),
    leaves: read('leaves.csv'),
  };
}
const data = () => (cache ??= loadData());

const num = (v: string) => Number(v);
const PRIORITY_RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function listEmployees() {
  return data().employees.map((e) => ({
    id: e.employee_id,
    name: e.name,
    role: e.role,
    department: e.department,
  }));
}

/** Accepts dataset ids (E004) and app login keys (EMP004), any case. */
function normalizeId(raw: string) {
  const m = /^E(?:MP)?0*(\d+)$/i.exec(raw.trim());
  return m ? 'E' + m[1].padStart(3, '0') : raw.trim();
}

export function getInsights(rawId: string) {
  const employeeId = normalizeId(rawId);
  const d = data();
  const emp = d.employees.find((e) => e.employee_id === employeeId);
  if (!emp) return null;

  /* ---- Skills ---- */
  const skillById = new Map(d.skills.map((s) => [s.skill_id, s]));
  const mySkills = d.employeeSkills
    .filter((r) => r.employee_id === employeeId)
    .map((r) => ({
      id: r.skill_id,
      name: skillById.get(r.skill_id)?.skill_name ?? r.skill_id,
      category: skillById.get(r.skill_id)?.category ?? '',
      level: num(r.proficiency_1to5),
      years: num(r.years_of_experience),
      lastUsedYear: num(r.last_used_year),
      certified: r.certified.toLowerCase() === 'true',
    }))
    .sort((a, b) => b.level - a.level || b.years - a.years);
  const levelOf = new Map(mySkills.map((s) => [s.id, s.level]));

  /* ---- Workload ---- */
  const capacity = num(emp.weekly_capacity_hours);
  const projectById = new Map(d.projects.map((p) => [p.project_id, p]));
  const myAssignments = d.assignments.filter((a) => a.employee_id === employeeId);
  const today = new Date().toISOString().slice(0, 10);
  const workload = {
    capacityHours: capacity,
    allocationPct: num(emp.current_allocation_pct),
    allocatedHours: Math.round((capacity * num(emp.current_allocation_pct)) / 100),
    availableHours: num(emp.available_hours_per_week),
    status: emp.availability_status,
    availableFrom: emp.available_from,
    breakdown: myAssignments
      .map((a) => ({
        projectId: a.project_id,
        projectName: projectById.get(a.project_id)?.project_name ?? a.project_id,
        role: a.role_on_project,
        pct: num(a.allocation_pct),
        hours: Math.round((capacity * num(a.allocation_pct)) / 100),
        start: a.start_date,
        end: a.end_date,
      }))
      .sort((a, b) => b.pct - a.pct),
    upcomingLeaves: d.leaves
      .filter((l) => l.employee_id === employeeId && l.leave_end >= today)
      .map((l) => ({ type: l.leave_type, start: l.leave_start, end: l.leave_end }))
      .sort((a, b) => a.start.localeCompare(b.start)),
  };

  /* ---- Project matches ----
     score = importance-weighted share of each requirement you cover
     (your level / required level, capped at 1). Projects you are already on
     and completed projects are skipped. */
  const assignedIds = new Set(myAssignments.map((a) => a.project_id));
  const matches = d.projects
    .filter((p) => p.status !== 'Completed' && !assignedIds.has(p.project_id))
    .map((p) => {
      const reqs = d.requirements.filter((r) => r.project_id === p.project_id);
      const totalWeight = reqs.reduce((s, r) => s + num(r.importance_1to5), 0) || 1;
      const earned = reqs.reduce((s, r) => {
        const mine = levelOf.get(r.skill_id) ?? 0;
        return s + num(r.importance_1to5) * Math.min(mine / num(r.min_proficiency), 1);
      }, 0);
      return {
        projectId: p.project_id,
        name: p.project_name,
        client: p.client,
        priority: p.priority,
        status: p.status,
        start: p.start_date,
        // Earliest date you could join: after you free up, once the project has started, and not in the past.
        earliestJoin: [emp.available_from, p.start_date, today].sort().pop() as string,
        hasCapacity: workload.availableHours > 0,
        score: Math.round((earned / totalWeight) * 100),
        requirements: reqs
          .map((r) => {
            const mine = levelOf.get(r.skill_id) ?? 0;
            return {
              skillId: r.skill_id,
              name: r.skill_name,
              required: num(r.min_proficiency),
              mine,
              met: mine >= num(r.min_proficiency),
              importance: num(r.importance_1to5),
            };
          })
          .sort((a, b) => b.importance - a.importance),
      };
    })
    .sort((a, b) => b.score - a.score || (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0))
    .slice(0, 5);

  /* ---- Training recommendations ----
     For every unmet requirement in your top 3 matches, chain the courses that
     take you from your current level up to the required level
     (courses in the dataset go 1->3 and 3->5). */
  const gaps = new Map<string, { name: string; current: number; target: number; projects: Set<string> }>();
  for (const m of matches.slice(0, 3)) {
    for (const r of m.requirements) {
      if (r.met) continue;
      const g = gaps.get(r.skillId) ?? { name: r.name, current: r.mine, target: 0, projects: new Set<string>() };
      g.target = Math.max(g.target, r.required);
      g.projects.add(m.name);
      gaps.set(r.skillId, g);
    }
  }
  const training = [...gaps.entries()]
    .map(([skillId, g]) => {
      const path: { id: string; title: string; hours: number; provider: string; mode: string; from: number; to: number }[] = [];
      let level = g.current;
      while (level < g.target) {
        const next = d.courses
          .filter((c) => c.skill_id === skillId && num(c.from_level) <= Math.max(level, 1) && num(c.to_level) > level)
          .sort((a, b) => num(a.to_level) - num(b.to_level) || num(a.duration_hours) - num(b.duration_hours))[0];
        if (!next) break;
        path.push({
          id: next.course_id,
          title: next.course_title,
          hours: num(next.duration_hours),
          provider: next.provider,
          mode: next.mode,
          from: num(next.from_level),
          to: num(next.to_level),
        });
        level = num(next.to_level);
      }
      return {
        skillId,
        skill: g.name,
        current: g.current,
        target: g.target,
        neededFor: [...g.projects],
        courses: path,
        totalHours: path.reduce((s, c) => s + c.hours, 0),
      };
    })
    .filter((t) => t.courses.length > 0)
    .sort((a, b) => b.neededFor.length - a.neededFor.length || (a.target - a.current) - (b.target - b.current))
    .slice(0, 5);

  return {
    employee: {
      id: emp.employee_id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      seniority: emp.seniority,
      location: emp.location,
      experienceYears: num(emp.experience_years),
    },
    skills: mySkills,
    matches,
    workload,
    training,
  };
}