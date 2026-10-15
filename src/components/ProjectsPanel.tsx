import { useEffect, useState } from 'react';
import type { Project, NewProject, ProjectStatus } from '../types';
import { PROJECT_STATUSES } from '../constants';
import { fetchProjects, fetchExistingProjects, createProject } from '../lib/api';

type Mode = 'existing' | 'new';

const emptyForm = {
  name: '',
  description: '',
  status: 'planning' as ProjectStatus,
  startDate: '',
  endDate: '',
  skills: '',
  teamSize: 1,
};

export default function ProjectsPanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [existing, setExisting] = useState<NewProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('new');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setProjects(await fetchProjects());
      setError('');
    } catch {
      setError('Could not load projects. Is the backend running on port 5000?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openForm(m: Mode) {
    setMode(m);
    setForm(emptyForm);
    setError('');
    setOpen(true);
    if (m === 'existing') {
      try {
        setExisting(await fetchExistingProjects());
      } catch {
        setError('Could not load existing projects.');
      }
    }
  }

  async function addExisting(p: NewProject) {
    try {
      setSaving(true);
      const created = await createProject(p);
      setProjects((prev) => [created, ...prev]);
      setExisting((prev) => prev.filter((x) => x.name !== p.name));
      setError('');
    } catch {
      setError('Failed to add project.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.MouseEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Project name is required');
      return;
    }
    try {
      setSaving(true);
      const created = await createProject({
        name: form.name.trim(),
        description: form.description,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate,
        requiredSkills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        teamSize: Number(form.teamSize) || 0,
      });
      setProjects((prev) => [created, ...prev]);
      setOpen(false);
      setError('');
    } catch {
      setError('Failed to save project.');
    } finally {
      setSaving(false);
    }
  }

  const input = 'w-full rounded border border-gray-300 px-3 py-2 text-sm text-black';

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projects</h2>
        <div className="flex gap-2">
          <button onClick={() => openForm('existing')} className="rounded border px-3 py-1.5 text-sm">
            + Add Existing Project
          </button>
          <button onClick={() => openForm('new')} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
            + New Project
          </button>
        </div>
      </div>

      {error && !open && <p className="mb-3 text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm opacity-70">Loading...</p>}
      {!loading && projects.length === 0 && <p className="text-sm opacity-70">No projects yet.</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((p) => (
          <div key={p.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{p.name}</h3>
              <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-black">{p.status}</span>
            </div>
            <p className="mt-1 text-sm opacity-80">{p.description}</p>
            <p className="mt-2 text-xs opacity-70">
              {p.startDate || '—'} → {p.endDate || '—'} · Team: {p.teamSize}
            </p>
            {p.requiredSkills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.requiredSkills.map((s) => (
                  <span key={s} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">{s}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-lg bg-white p-5 text-black">
            <h3 className="text-lg font-semibold">
              {mode === 'existing' ? 'Add Existing Project' : 'New Project'}
            </h3>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {mode === 'existing' ? (
              <>
                {existing.length === 0 && (
                  <p className="text-sm text-gray-500">No more existing projects to add.</p>
                )}
                {existing.map((p) => (
                  <div key={p.name} className="rounded border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-gray-600">{p.description}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {p.status} · {p.startDate || '—'} → {p.endDate || '—'} · Team: {p.teamSize}
                        </p>
                      </div>
                      <button
                        onClick={() => addExisting(p)}
                        disabled={saving}
                        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <button onClick={() => setOpen(false)} className="rounded border px-3 py-1.5 text-sm">
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <input className={input} placeholder="Project name" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <textarea className={input} placeholder="Description" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <select className={input} value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input type="date" className={input} value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  <input type="date" className={input} value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
                <input className={input} placeholder="Required skills (comma separated)" value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })} />
                <input type="number" min={1} className={input} placeholder="Team size" value={form.teamSize}
                  onChange={(e) => setForm({ ...form, teamSize: Number(e.target.value) })} />
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setOpen(false)} className="rounded border px-3 py-1.5 text-sm">Cancel</button>
                  <button onClick={handleSubmit} disabled={saving}
                    className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}