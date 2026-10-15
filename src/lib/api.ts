import type { Project, NewProject } from '../types';

const API_URL = 'http://127.0.0.1:5000/api';

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`);
  if (!res.ok) throw new Error(`projects failed: ${res.status}`);
  return res.json();
}

export async function fetchExistingProjects(): Promise<NewProject[]> {
  const res = await fetch(`${API_URL}/existing-projects`);
  if (!res.ok) throw new Error(`existing-projects failed: ${res.status}`);
  return res.json();
}

export async function createProject(project: NewProject): Promise<Project> {
  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error(`create failed: ${res.status}`);
  return res.json();
}